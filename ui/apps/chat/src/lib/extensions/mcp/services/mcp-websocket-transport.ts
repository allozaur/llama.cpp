/**
 * WebSocket client transport for MCP
 *
 * MCP SDK v2 has no WebSocket transport, it is not a spec transport.
 * This is the v1 transport, kept so WebSocket servers still work. Consumed by mcp.service.
 */

import {
	type JSONRPCMessage,
	parseJSONRPCMessage,
	type Transport
} from '@modelcontextprotocol/client';

const SUBPROTOCOL = 'mcp';

export class WebSocketClientTransport implements Transport {
	onclose?: () => void;
	onerror?: (error: Error) => void;
	onmessage?: (message: JSONRPCMessage) => void;

	private socket?: WebSocket;

	async close(): Promise<void> {
		this.socket?.close();
	}

	constructor(private url: URL) {}

	async send(message: JSONRPCMessage): Promise<void> {
		if (!this.socket) {
			throw new Error('Not connected');
		}

		this.socket.send(JSON.stringify(message));
	}

	start(): Promise<void> {
		if (this.socket) {
			throw new Error('WebSocketClientTransport already started');
		}

		return new Promise((resolve, reject) => {
			const socket = new WebSocket(this.url, SUBPROTOCOL);

			this.socket = socket;

			socket.onerror = (event) => {
				const error =
					'error' in event
						? (event.error as Error)
						: new Error(`WebSocket error: ${JSON.stringify(event)}`);

				reject(error);
				this.onerror?.(error);
			};

			socket.onopen = () => resolve();

			socket.onclose = () => this.onclose?.();

			socket.onmessage = (event: MessageEvent) => {
				let message: JSONRPCMessage;

				try {
					message = parseJSONRPCMessage(JSON.parse(event.data));
				} catch (error) {
					this.onerror?.(error as Error);

					return;
				}

				this.onmessage?.(message);
			};
		});
	}
}
