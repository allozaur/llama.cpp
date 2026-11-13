// A reconnect loop waits between attempts. Shutting the store down, as
// switching the MCP extension off does, must end the loop instead of letting
// it bring a connection back.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('$lib/extensions/mcp/services/mcp.service', () => ({
	MCPService: {
		connect: vi.fn(),
		disconnect: vi.fn(async () => {})
	}
}));

import { MCP_RECONNECT } from '$lib/constants';
import { MCPService } from '$lib/extensions/mcp/services/mcp.service';
import { mcpStore } from '$lib/extensions/mcp/stores/index.svelte';
import type { MCPConnection, MCPServerConfig } from '$lib/types';

const connectMock = vi.mocked(MCPService.connect);
const disconnectMock = vi.mocked(MCPService.disconnect);
const CONFIG = { url: 'https://docs.example.com/mcp' } as MCPServerConfig;
const CONNECTION = { serverName: 'docs', tools: [] } as unknown as MCPConnection;

describe('mcpStore.autoReconnect', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.spyOn(console, 'log').mockImplementation(() => {});
		connectMock.mockReset();
		disconnectMock.mockClear();
	});

	afterEach(async () => {
		await mcpStore.shutdown();
		vi.useRealTimers();
		vi.restoreAllMocks();
	});

	it('reconnects a server that is still configured', async () => {
		connectMock.mockResolvedValue(CONNECTION);
		mcpStore.registerServerConfig('docs', CONFIG);

		const loop = mcpStore.autoReconnect('docs');

		await vi.advanceTimersByTimeAsync(MCP_RECONNECT.INITIAL_DELAY);
		await loop;

		expect(connectMock).toHaveBeenCalledOnce();
		expect(mcpStore.getConnections().get('docs')).toBe(CONNECTION);
	});

	it('gives up when the store shuts down while it waits', async () => {
		mcpStore.registerServerConfig('docs', CONFIG);

		const loop = mcpStore.autoReconnect('docs');

		await mcpStore.shutdown();
		await vi.advanceTimersByTimeAsync(MCP_RECONNECT.INITIAL_DELAY);
		await loop;

		expect(connectMock).not.toHaveBeenCalled();
		expect(mcpStore.getConnections().size).toBe(0);
	});

	it('closes a connection that arrives after the store shut down', async () => {
		let arrive: (connection: MCPConnection) => void = () => {};

		connectMock.mockReturnValue(new Promise<MCPConnection>((resolve) => (arrive = resolve)));
		mcpStore.registerServerConfig('docs', CONFIG);

		const loop = mcpStore.autoReconnect('docs');

		await vi.advanceTimersByTimeAsync(MCP_RECONNECT.INITIAL_DELAY);
		await mcpStore.shutdown();
		arrive(CONNECTION);
		await loop;

		expect(disconnectMock).toHaveBeenCalledWith(CONNECTION);
		expect(mcpStore.getConnections().size).toBe(0);
	});
});
