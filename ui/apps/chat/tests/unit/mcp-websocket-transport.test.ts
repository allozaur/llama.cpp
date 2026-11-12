import { WebSocketClientTransport } from '$lib/extensions/mcp/services/mcp-websocket-transport';
import { afterEach, describe, expect, it, vi } from 'vitest';

class FakeWebSocket {
	static instances: FakeWebSocket[] = [];

	onclose?: () => void;
	onerror?: (event: unknown) => void;
	onmessage?: (event: { data: string }) => void;
	onopen?: () => void;
	sent: string[] = [];

	close() {
		this.onclose?.();
	}

	constructor(
		public url: URL,
		public protocol: string
	) {
		FakeWebSocket.instances.push(this);
	}

	send(data: string) {
		this.sent.push(data);
	}
}

async function startTransport() {
	const transport = new WebSocketClientTransport(new URL('ws://example.com/mcp'));
	const started = transport.start();
	const socket = FakeWebSocket.instances.at(-1)!;

	socket.onopen?.();
	await started;

	return { socket, transport };
}

describe('WebSocketClientTransport', () => {
	afterEach(() => {
		FakeWebSocket.instances = [];
		vi.unstubAllGlobals();
	});

	it('opens the socket with the mcp subprotocol and sends JSON-RPC messages', async () => {
		vi.stubGlobal('WebSocket', FakeWebSocket);

		const { socket, transport } = await startTransport();

		expect(socket.url.href).toBe('ws://example.com/mcp');
		expect(socket.protocol).toBe('mcp');

		await transport.send({ id: 1, jsonrpc: '2.0', method: 'ping' });

		expect(socket.sent).toEqual(['{"id":1,"jsonrpc":"2.0","method":"ping"}']);
	});

	it('delivers valid messages and reports invalid frames as errors', async () => {
		vi.stubGlobal('WebSocket', FakeWebSocket);

		const { socket, transport } = await startTransport();
		const onmessage = vi.fn();
		const onerror = vi.fn();

		transport.onmessage = onmessage;
		transport.onerror = onerror;

		socket.onmessage?.({ data: '{"id":1,"jsonrpc":"2.0","result":{}}' });
		socket.onmessage?.({ data: 'not json' });
		socket.onmessage?.({ data: '{"foo":"bar"}' });

		expect(onmessage).toHaveBeenCalledTimes(1);
		expect(onmessage).toHaveBeenCalledWith({ id: 1, jsonrpc: '2.0', result: {} });
		expect(onerror).toHaveBeenCalledTimes(2);
	});

	it('rejects start when the socket fails and notifies on close', async () => {
		vi.stubGlobal('WebSocket', FakeWebSocket);

		const failing = new WebSocketClientTransport(new URL('ws://example.com/mcp'));
		const started = failing.start();

		FakeWebSocket.instances.at(-1)!.onerror?.({ error: new Error('refused') });
		await expect(started).rejects.toThrow('refused');

		const { transport } = await startTransport();
		const onclose = vi.fn();

		transport.onclose = onclose;
		await transport.close();

		expect(onclose).toHaveBeenCalledTimes(1);
		await expect(
			new WebSocketClientTransport(new URL('ws://example.com/mcp')).send({
				jsonrpc: '2.0',
				method: 'notifications/initialized'
			})
		).rejects.toThrow('Not connected');
	});
});
