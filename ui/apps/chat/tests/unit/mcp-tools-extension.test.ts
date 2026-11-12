// MCP reaches the tools of the core only through what its extension
// contributes: a tool provider built on mcpStore and a flow hook that holds
// the connections while a flow runs.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('$lib/services/database.service', () => ({
	DatabaseService: {}
}));
// the component draws on the app's component barrel, which needs a browser
vi.mock('$lib/extensions/mcp/components/contributions/McpToolGroupIdentity.svelte', () => ({
	default: () => {}
}));

import { HealthCheckStatus, ToolSource } from '$lib/enums';
import type { ExtensionContext, FlowHook, ToolProvider } from '$lib/extensions';
import { extensions } from '$lib/extensions';
import { mcpStore } from '$lib/extensions/mcp/stores/index.svelte';
import {
	contributeTools,
	enableAllToolsForServer,
	policyEnabledServerIds
} from '$lib/extensions/mcp/tools';
import { conversationsStore } from '$lib/stores/conversations/index.svelte';
import { toolsStore } from '$lib/stores/tools.svelte';
import type { HealthCheckState, MCPConnection, MCPServerSettingsEntry } from '$lib/types';

const SERVERS: MCPServerSettingsEntry[] = [
	{ enabled: true, id: 'srv-1', name: 'Docs', url: 'https://docs.example.com/mcp' },
	{ enabled: false, id: 'srv-2', name: 'Off', url: 'https://off.example.com/mcp' },
	{ enabled: true, id: 'srv-3', name: 'No url', url: ' ' }
];

function contributed(): { hook: FlowHook; provider: ToolProvider } {
	const made: { hook?: FlowHook; provider?: ToolProvider } = {};
	const ctx: ExtensionContext = {
		contribute: (point, contribution) => {
			if (point === 'tools') made.provider = contribution as ToolProvider;

			if (point === 'flow') made.hook = contribution as FlowHook;
		},
		onDeactivate: () => {}
	};

	contributeTools(ctx);

	return { hook: made.hook!, provider: made.provider! };
}

function connection(...tools: { description?: string; inputSchema?: unknown; name: string }[]) {
	return { tools } as unknown as MCPConnection;
}

function mockConnections(connections: Record<string, MCPConnection>) {
	vi.spyOn(mcpStore, 'getConnections').mockReturnValue(new Map(Object.entries(connections)));
}

beforeEach(() => {
	vi.restoreAllMocks();
	vi.spyOn(mcpStore, 'getServers').mockReturnValue(SERVERS);
	mockConnections({});
});

afterEach(() => {
	for (const key of [...toolsStore.disabledTools]) toolsStore.setToolEnabled(key, true);
});

describe('MCP tool provider', () => {
	it('contributes one provider for the MCP category and one flow hook', () => {
		const { hook, provider } = contributed();

		expect(provider.source).toBe(ToolSource.MCP);
		expect(hook).toBeTypeOf('function');
	});

	it('lists the tools of the live connections, grouped by server', () => {
		mockConnections({
			'srv-1': connection(
				{ description: 'Search the docs', inputSchema: { type: 'object' }, name: 'search' },
				{ name: 'ping' }
			)
		});

		const entries = contributed().provider.entries();

		expect(entries).toEqual([
			{
				definition: {
					function: {
						description: 'Search the docs',
						name: 'search',
						parameters: { type: 'object' }
					},
					type: 'function'
				},
				groupId: 'srv-1',
				groupLabel: 'Docs'
			},
			{
				definition: {
					function: {
						description: undefined,
						name: 'ping',
						parameters: { properties: {}, required: [], type: 'object' }
					},
					type: 'function'
				},
				groupId: 'srv-1',
				groupLabel: 'Docs'
			}
		]);
	});

	it('gives a schema property without a type the type of its default', () => {
		const inputSchema = {
			properties: {
				flag: { default: true },
				items: { items: { properties: { depth: { default: 1.5 } } }, type: 'array' },
				limit: { default: 5 },
				nested: { properties: { query: { default: 'all' } } },
				typed: { default: 5, type: 'string' },
				untyped: {}
			},
			type: 'object'
		};

		mockConnections({ 'srv-1': connection({ inputSchema, name: 'search' }) });

		const [{ definition }] = contributed().provider.entries();

		expect(definition.function.parameters).toEqual({
			properties: {
				flag: { default: true, type: 'boolean' },
				items: {
					items: { properties: { depth: { default: 1.5, type: 'number' } } },
					type: 'array'
				},
				limit: { default: 5, type: 'integer' },
				nested: { properties: { query: { default: 'all', type: 'string' } } },
				typed: { default: 5, type: 'string' },
				untyped: {}
			},
			type: 'object'
		});
		// the server's own schema is left as it was
		expect(inputSchema.properties.limit).toEqual({ default: 5 });
	});

	it('falls back to the tools the health checks found while nothing is connected', () => {
		const health: Record<string, HealthCheckState> = {
			'srv-1': {
				logs: [],
				status: HealthCheckStatus.SUCCESS,
				tools: [{ description: 'Search the docs', name: 'search' }]
			},
			// a server that is switched off is not listed, whatever its last check said
			'srv-2': { logs: [], status: HealthCheckStatus.SUCCESS, tools: [{ name: 'hidden' }] }
		};

		vi.spyOn(mcpStore, 'getHealthCheckState').mockImplementation(
			(serverId) => health[serverId] ?? { status: HealthCheckStatus.IDLE }
		);

		expect(contributed().provider.entries()).toEqual([
			{
				definition: {
					function: {
						description: 'Search the docs',
						name: 'search',
						parameters: { properties: {}, required: [], type: 'object' }
					},
					type: 'function'
				},
				groupId: 'srv-1',
				groupLabel: 'Docs'
			}
		]);
	});

	it('runs a call through mcpStore and hands back its text', async () => {
		const executeTool = vi
			.spyOn(mcpStore, 'executeTool')
			.mockResolvedValue({ content: 'found it', isError: true });
		const { signal } = new AbortController();
		const result = await contributed().provider.execute(
			{ arguments: '{"query":"llama"}', id: 'call_0', name: 'search' },
			signal
		);

		expect(executeTool).toHaveBeenCalledWith(
			{ function: { arguments: '{"query":"llama"}', name: 'search' }, id: 'call_0' },
			signal
		);
		expect(result).toEqual({ content: 'found it', isError: false });
	});

	it('fails the call of a tool no connected server has', async () => {
		await expect(
			contributed().provider.execute({ arguments: '{}', id: 'call_0', name: 'nope' })
		).rejects.toThrow('Unknown tool: nope');
	});

	it('is configured once a server is enabled in the settings', () => {
		const hasEnabledServers = vi.spyOn(mcpStore, 'hasEnabledServers').mockReturnValue(false);
		const { provider } = contributed();

		expect(provider.isConfigured()).toBe(false);

		hasEnabledServers.mockReturnValue(true);

		expect(provider.isConfigured()).toBe(true);
	});

	it('resolves icons through the servers', () => {
		vi.spyOn(mcpStore, 'getServerFavicon').mockImplementation((id) => `icon:${id}`);
		vi.spyOn(mcpStore, 'getServerFaviconForTool').mockImplementation((name) => `tool:${name}`);

		const { provider } = contributed();

		expect(provider.groupIcon?.('srv-1')).toBe('icon:srv-1');
		expect(provider.toolIcon?.('search')).toBe('tool:search');
		expect(provider.groupIdentity).toBeDefined();
	});

	it('checks the enabled servers again when asked to refresh', () => {
		const run = vi.spyOn(mcpStore, 'runHealthChecksForServers').mockResolvedValue();

		void contributed().provider.refresh?.();

		expect(run).toHaveBeenCalledWith([SERVERS[0], SERVERS[2]]);
	});

	it('words the empty tools panel by whether a server exists', () => {
		const { provider } = contributed();

		expect(provider.emptyHint?.()).toEqual({
			action: 'Enable MCP Server(s) to access',
			sentence: 'To see MCP Tools you need to add / enable MCP Server(s).',
			toolsLabel: 'MCP Tools'
		});

		vi.mocked(mcpStore.getServers).mockReturnValue([]);

		expect(provider.emptyHint?.().action).toBe('Add MCP Server(s) to access');
	});
});

describe('MCP servers under the tool policy', () => {
	it('counts the enabled servers with a url whose group and category are on', async () => {
		expect(policyEnabledServerIds()).toEqual(['srv-1']);

		toolsStore.setToolEnabled('mcp:srv-1', false);

		expect(policyEnabledServerIds()).toEqual([]);

		toolsStore.setToolEnabled('mcp:srv-1', true);
		vi.spyOn(conversationsStore.preferences, 'isCategoryEnabled').mockImplementation(
			(source) => source !== ToolSource.MCP
		);

		expect(policyEnabledServerIds()).toEqual([]);
	});

	it('connects before a flow only when the policy leaves a server on', async () => {
		const ensureInitialized = vi.spyOn(mcpStore, 'ensureInitialized').mockResolvedValue(true);
		const { provider } = contributed();

		toolsStore.setToolEnabled('mcp:srv-1', false);
		await provider.prepare?.();

		expect(ensureInitialized).not.toHaveBeenCalled();

		toolsStore.setToolEnabled('mcp:srv-1', true);
		await provider.prepare?.();

		expect(ensureInitialized).toHaveBeenCalledOnce();
	});

	it('holds the connections for the length of a flow', async () => {
		const acquire = vi.spyOn(mcpStore, 'acquireConnection').mockImplementation(() => {});
		const release = vi.spyOn(mcpStore, 'releaseConnection').mockResolvedValue();
		const end = contributed().hook({ conversationId: 'conv-1' });

		expect(acquire).toHaveBeenCalledOnce();
		expect(release).not.toHaveBeenCalled();

		await end?.();

		expect(release).toHaveBeenCalledOnce();
	});

	it('holds nothing when the policy leaves no server on', () => {
		const acquire = vi.spyOn(mcpStore, 'acquireConnection').mockImplementation(() => {});

		toolsStore.setToolEnabled('mcp:srv-1', false);

		expect(contributed().hook({ conversationId: 'conv-1' })).toBeUndefined();
		expect(acquire).not.toHaveBeenCalled();
	});

	it('enables the group and every tool of a connected server', () => {
		mockConnections({ 'srv-1': connection({ name: 'search' }, { name: 'ping' }) });
		toolsStore.setToolEnabled('mcp:srv-1', false);
		toolsStore.setToolEnabled('mcp-srv-1:search', false);
		toolsStore.setToolEnabled('mcp-srv-2:search', false);

		enableAllToolsForServer('srv-2');

		expect(toolsStore.disabledTools.size).toBe(3);

		enableAllToolsForServer('srv-1');

		expect([...toolsStore.disabledTools]).toEqual(['mcp-srv-2:search']);
	});
});

describe('the MCP extension in the registry', () => {
	afterEach(() => extensions.setEnabled('mcp-test', false));

	// these strings are stored in localStorage and on conversation rows
	it('lists its tools in the tools store under the stored keys while it is on', async () => {
		mockConnections({ 'srv-1': connection({ name: 'search' }) });
		extensions.register({
			description: "MCP's tools, as the extension contributes them",
			id: 'mcp-test',
			load: async () => ({ default: { activate: contributeTools } }),
			name: 'MCP'
		});

		expect(toolsStore.getToolSource('search')).toBeNull();

		await extensions.setEnabled('mcp-test', true);

		expect(toolsStore.getPermissionKey('search')).toBe('mcp-srv-1:search');
		expect(toolsStore.getToolServerLabel('search')).toBe('Docs');
		expect(toolsStore.toolGroups.find((group) => group.serverId === 'srv-1')).toMatchObject({
			key: 'mcp:srv-1',
			label: 'Docs',
			source: ToolSource.MCP
		});
		expect(extensions.contributions('flow')).toHaveLength(1);

		await extensions.setEnabled('mcp-test', false);

		expect(toolsStore.getToolSource('search')).toBeNull();
		expect(extensions.contributions('flow')).toEqual([]);
	});
});
