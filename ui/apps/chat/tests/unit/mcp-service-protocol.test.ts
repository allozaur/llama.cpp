import {
	createMcpHandler,
	McpServer,
	type ServerOptions,
	WebStandardStreamableHTTPServerTransport
} from '@modelcontextprotocol/server';
import { MCP_RECONNECT } from '$lib/constants';
import { MCPConnectionPhase, MCPLogLevel, MCPTransportType } from '$lib/enums';
import { MCPService } from '$lib/extensions/mcp/services/mcp.service';
import type { MCPConnectionLog, MCPServerConfig } from '$lib/types';
import { afterEach, describe, expect, it, vi } from 'vitest';

const RESOURCE_URI = 'config://app';
const HTTP_CONFIG: MCPServerConfig = {
	transport: MCPTransportType.STREAMABLE_HTTP,
	url: 'https://example.com/mcp'
};

interface RecordedRequest {
	method: string;
	rpcMethod?: string;
	sessionId: string | null;
}

function buildServer(options?: ServerOptions): McpServer {
	const server = new McpServer(
		{ name: 'test-server', version: '1.0.0' },
		{ capabilities: { resources: { subscribe: true } }, ...options }
	);

	server.registerTool('ping', { description: 'Reply with pong' }, async () => ({
		content: [{ text: 'pong', type: 'text' }]
	}));
	server.registerResource('config', RESOURCE_URI, {}, async (uri) => ({
		contents: [{ text: '{}', uri: uri.href }]
	}));

	return server;
}

// An older server: 2025-era protocol with a session
async function startSessionServer() {
	const server = buildServer();
	const transport = new WebStandardStreamableHTTPServerTransport({
		enableJsonResponse: true,
		sessionIdGenerator: () => 'session-1'
	});

	// McpServer has no handler for the session-only subscribe request
	server.server.setRequestHandler('resources/subscribe', async () => ({}));
	await server.connect(transport);

	return { handle: (request: Request) => transport.handleRequest(request), server };
}

// Sends the client's fetch calls to an in-process MCP server and records them
function serveWith(
	handle: (request: Request, rpcMethod?: string) => Promise<Response>
): RecordedRequest[] {
	const requests: RecordedRequest[] = [];

	vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
		const request = new Request(input, init);
		const body = typeof init?.body === 'string' ? JSON.parse(init.body) : undefined;

		requests.push({
			method: request.method,
			rpcMethod: body?.method,
			sessionId: request.headers.get('mcp-session-id')
		});

		return handle(request, body?.method);
	});

	return requests;
}

// Passes a response on with a body the test can end, like a proxy that cuts a long stream
function cuttable(response: Response): { cut: () => void; response: Response } {
	const reader = response.body!.getReader();

	let cut = () => {};

	const body = new ReadableStream<Uint8Array>({
		async pull(controller) {
			const { done, value } = await reader.read();

			try {
				if (done) controller.close();
				else controller.enqueue(value);
			} catch {
				// already cut
			}
		},
		start(controller) {
			cut = () => controller.close();
		}
	});

	return {
		cut: () => cut(),
		response: new Response(body, { headers: response.headers, status: response.status })
	};
}

describe('MCPService protocol negotiation', () => {
	afterEach(() => {
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
	});

	it('uses the stateless protocol when the server speaks it', async () => {
		const handler = createMcpHandler(() => buildServer(), { legacy: 'reject' });
		const requests = serveWith((request) => handler.fetch(request));
		const logs: MCPConnectionLog[] = [];
		const onToolsChanged = vi.fn();
		const connection = await MCPService.connect(
			'test-server',
			HTTP_CONFIG,
			undefined,
			undefined,
			(_phase, log) => logs.push(log),
			{ tools: { onChanged: onToolsChanged } }
		);

		expect(connection.protocolVersion).toBe('2026-07-28');
		expect(connection.transport.sessionId).toBeUndefined();
		expect(connection.serverInfo?.name).toBe('test-server');
		expect(connection.tools.map((tool) => tool.name)).toEqual(['ping']);
		expect(requests.map((request) => request.rpcMethod)).toEqual([
			'server/discover',
			'subscriptions/listen',
			'tools/list'
		]);
		expect(
			logs.find((log) => log.phase === MCPConnectionPhase.CAPABILITIES_EXCHANGED)?.message
		).toBe('Capabilities exchanged successfully (protocol 2026-07-28, stateless)');

		await expect(MCPService.callTool(connection, { arguments: {}, name: 'ping' })).resolves.toEqual(
			{ content: 'pong', isError: false }
		);

		// list changes arrive on the subscriptions/listen stream
		handler.notify.toolsChanged();
		await vi.waitFor(() => expect(onToolsChanged).toHaveBeenCalledTimes(1));
		expect(onToolsChanged.mock.calls[0][1]).toHaveLength(1);

		await MCPService.subscribeResource(connection, RESOURCE_URI);

		expect(requests.at(-1)?.rpcMethod).toBe('subscriptions/listen');
		expect(connection.resourceSubscriptions?.has(RESOURCE_URI)).toBe(true);

		await MCPService.unsubscribeResource(connection, RESOURCE_URI);

		expect(connection.resourceSubscriptions?.size).toBe(0);

		await MCPService.disconnect(connection);
		await handler.close();

		expect(requests.every((request) => request.method === 'POST')).toBe(true);
		expect(requests.every((request) => request.sessionId === null)).toBe(true);
		expect(requests.some((request) => request.rpcMethod === 'initialize')).toBe(false);
	});

	it('falls back to the session handshake on an older server', async () => {
		const { handle, server } = await startSessionServer();
		const requests = serveWith(handle);
		const logs: MCPConnectionLog[] = [];
		const connection = await MCPService.connect(
			'test-server',
			HTTP_CONFIG,
			undefined,
			undefined,
			(_phase, log) => logs.push(log)
		);

		expect(connection.protocolVersion).toMatch(/^2025-/);
		expect(connection.transport.sessionId).toBe('session-1');
		expect(connection.tools.map((tool) => tool.name)).toEqual(['ping']);
		expect(requests.slice(0, 3).map((request) => request.rpcMethod)).toEqual([
			'server/discover',
			'initialize',
			'notifications/initialized'
		]);
		expect(
			logs.find((log) => log.phase === MCPConnectionPhase.CAPABILITIES_EXCHANGED)?.message
		).toBe(
			`Capabilities exchanged successfully (protocol ${connection.protocolVersion}, initialize handshake)`
		);

		await expect(MCPService.callTool(connection, { arguments: {}, name: 'ping' })).resolves.toEqual(
			{ content: 'pong', isError: false }
		);

		await MCPService.subscribeResource(connection, RESOURCE_URI);

		expect(requests.at(-1)).toEqual({
			method: 'POST',
			rpcMethod: 'resources/subscribe',
			sessionId: 'session-1'
		});
		expect(connection.resourceSubscriptions).toBeUndefined();

		await MCPService.disconnect(connection);
		await server.close();

		expect(requests.at(-1)).toEqual({
			method: 'DELETE',
			rpcMethod: undefined,
			sessionId: 'session-1'
		});
	});

	it('does not probe a WebSocket server', async () => {
		const sent: string[] = [];

		class FakeWebSocket {
			onclose?: () => void;
			onmessage?: (event: { data: string }) => void;
			onopen?: () => void;

			close() {
				this.onclose?.();
			}

			constructor() {
				queueMicrotask(() => this.onopen?.());
			}

			send(data: string) {
				const message = JSON.parse(data);

				sent.push(message.method);

				if (message.method !== 'initialize') return;

				const result = {
					capabilities: {},
					protocolVersion: message.params.protocolVersion,
					serverInfo: { name: 'ws-server', version: '1.0.0' }
				};

				queueMicrotask(() =>
					this.onmessage?.({ data: JSON.stringify({ id: message.id, jsonrpc: '2.0', result }) })
				);
			}
		}

		vi.stubGlobal('WebSocket', FakeWebSocket);

		const connection = await MCPService.connect('ws-server', {
			transport: MCPTransportType.WEBSOCKET,
			url: 'ws://example.com/mcp'
		});

		expect(sent).toEqual(['initialize', 'notifications/initialized']);
		expect(connection.protocolVersion).toMatch(/^2025-/);

		await MCPService.disconnect(connection);
	});

	it('retries with the session handshake when the probe gets a server error', async () => {
		const { handle, server } = await startSessionServer();
		const requests = serveWith(async (request, rpcMethod) =>
			rpcMethod === 'server/discover' ? new Response('oops', { status: 500 }) : handle(request)
		);
		const logs: MCPConnectionLog[] = [];
		const connection = await MCPService.connect(
			'test-server',
			HTTP_CONFIG,
			undefined,
			undefined,
			(_phase, log) => logs.push(log)
		);

		expect(connection.protocolVersion).toMatch(/^2025-/);
		expect(connection.transport.sessionId).toBe('session-1');
		expect(connection.tools.map((tool) => tool.name)).toEqual(['ping']);
		expect(requests.slice(0, 3).map((request) => request.rpcMethod)).toEqual([
			'server/discover',
			'initialize',
			'notifications/initialized'
		]);
		expect(
			logs.filter(
				(log) =>
					log.level === MCPLogLevel.WARN &&
					log.message ===
						'Stateless protocol probe failed (Version negotiation failed: the server answered the probe with HTTP 500), using the session handshake'
			)
		).toHaveLength(1);

		await MCPService.disconnect(connection);
		await server.close();
	});

	it('retries with the session handshake when the probe gets no reply', async () => {
		const { handle, server } = await startSessionServer();
		const requests = serveWith(async (request, rpcMethod) =>
			rpcMethod === 'server/discover' ? new Response(null, { status: 202 }) : handle(request)
		);
		const connection = await MCPService.connect('test-server', {
			...HTTP_CONFIG,
			handshakeTimeoutMs: 1000
		});

		expect(connection.transport.sessionId).toBe('session-1');
		expect(requests.slice(0, 2).map((request) => request.rpcMethod)).toEqual([
			'server/discover',
			'initialize'
		]);

		await MCPService.disconnect(connection);
		await server.close();
	});

	it('does not retry when the server asks for authorization', async () => {
		const requests = serveWith(async () => new Response('Unauthorized', { status: 401 }));
		const logs: MCPConnectionLog[] = [];

		await expect(
			MCPService.connect('test-server', HTTP_CONFIG, undefined, undefined, (_phase, log) =>
				logs.push(log)
			)
		).rejects.toMatchObject({ status: 401 });

		expect(requests.map((request) => request.rpcMethod)).toEqual(['server/discover']);
		expect(logs.some((log) => log.message.startsWith('Stateless protocol probe failed'))).toBe(
			false
		);
	});

	it('does not retry a failed session handshake', async () => {
		const requests = serveWith(
			async (_request, rpcMethod) =>
				new Response('oops', { status: rpcMethod === 'server/discover' ? 404 : 500 })
		);

		await expect(MCPService.connect('test-server', HTTP_CONFIG)).rejects.toMatchObject({
			status: 500
		});

		expect(requests.map((request) => request.rpcMethod)).toEqual(['server/discover', 'initialize']);
	});
});

describe('MCPService stateless connection', () => {
	const initialDelay = MCP_RECONNECT.INITIAL_DELAY;

	afterEach(() => {
		MCP_RECONNECT.INITIAL_DELAY = initialDelay;
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
	});

	it('reopens a listen stream that was cut and stops when disconnected', async () => {
		MCP_RECONNECT.INITIAL_DELAY = 20;

		const handler = createMcpHandler(() => buildServer(), { legacy: 'reject' });
		const streams: { cut: () => void }[] = [];
		const requests = serveWith(async (request, rpcMethod) => {
			const response = await handler.fetch(request);

			if (rpcMethod !== 'subscriptions/listen') return response;

			const stream = cuttable(response);

			streams.push(stream);

			return stream.response;
		});
		const listens = () =>
			requests.filter((request) => request.rpcMethod === 'subscriptions/listen').length;
		const onToolsChanged = vi.fn();
		const warn = vi.spyOn(console, 'warn');
		const connection = await MCPService.connect(
			'test-server',
			HTTP_CONFIG,
			undefined,
			undefined,
			undefined,
			{ tools: { onChanged: onToolsChanged } }
		);

		expect(listens()).toBe(1);

		// the list-changed stream
		streams[0].cut();
		await vi.waitFor(() => expect(listens()).toBe(2));

		handler.notify.toolsChanged();
		await vi.waitFor(() => expect(onToolsChanged).toHaveBeenCalledTimes(1));

		// a resource stream
		await MCPService.subscribeResource(connection, RESOURCE_URI);

		const subscription = connection.resourceSubscriptions?.get(RESOURCE_URI);

		expect(listens()).toBe(3);

		streams[2].cut();
		await vi.waitFor(() => expect(listens()).toBe(4));
		await vi.waitFor(() =>
			expect(connection.resourceSubscriptions?.get(RESOURCE_URI)).not.toBe(subscription)
		);

		await MCPService.unsubscribeResource(connection, RESOURCE_URI);

		expect(connection.resourceSubscriptions?.size).toBe(0);

		streams[1].cut();
		await MCPService.disconnect(connection);
		await new Promise((resolve) => setTimeout(resolve, 100));

		expect(listens()).toBe(4);
		expect(warn).not.toHaveBeenCalled();

		await handler.close();
	});

	it('lists from the server again when the server allows a cached answer', async () => {
		const handler = createMcpHandler(
			() => buildServer({ cacheHints: { 'tools/list': { ttlMs: 60_000 } } }),
			{ legacy: 'reject' }
		);
		const requests = serveWith((request) => handler.fetch(request));
		const connection = await MCPService.connect('test-server', HTTP_CONFIG);

		await MCPService.listTools(connection);

		expect(requests.filter((request) => request.rpcMethod === 'tools/list')).toHaveLength(2);

		await MCPService.disconnect(connection);
		await handler.close();
	});
});
