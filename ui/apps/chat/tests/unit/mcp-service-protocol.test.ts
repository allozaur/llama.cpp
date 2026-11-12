import {
	createMcpHandler,
	McpServer,
	WebStandardStreamableHTTPServerTransport
} from '@modelcontextprotocol/server';
import { MCPConnectionPhase, MCPTransportType } from '$lib/enums';
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

function buildServer(): McpServer {
	const server = new McpServer(
		{ name: 'test-server', version: '1.0.0' },
		{ capabilities: { resources: { subscribe: true } } }
	);

	server.registerTool('ping', { description: 'Reply with pong' }, async () => ({
		content: [{ text: 'pong', type: 'text' }]
	}));
	server.registerResource('config', RESOURCE_URI, {}, async (uri) => ({
		contents: [{ text: '{}', uri: uri.href }]
	}));

	return server;
}

// Sends the client's fetch calls to an in-process MCP server and records them
function serveWith(handle: (request: Request) => Promise<Response>): RecordedRequest[] {
	const requests: RecordedRequest[] = [];

	vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
		const request = new Request(input, init);
		const body = typeof init?.body === 'string' ? JSON.parse(init.body) : undefined;

		requests.push({
			method: request.method,
			rpcMethod: body?.method,
			sessionId: request.headers.get('mcp-session-id')
		});

		return handle(request);
	});

	return requests;
}

describe('MCPService protocol negotiation', () => {
	afterEach(() => {
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
	});

	it('uses the stateless protocol when the server speaks it', async () => {
		const handler = createMcpHandler(buildServer, { legacy: 'reject' });
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
		const server = buildServer();
		const serverTransport = new WebStandardStreamableHTTPServerTransport({
			enableJsonResponse: true,
			sessionIdGenerator: () => 'session-1'
		});

		// McpServer has no handler for the session-only subscribe request
		server.server.setRequestHandler('resources/subscribe', async () => ({}));
		await server.connect(serverTransport);

		const requests = serveWith((request) => serverTransport.handleRequest(request));
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
});
