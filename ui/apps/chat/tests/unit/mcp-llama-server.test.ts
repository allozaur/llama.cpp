// The MCP servers llama-server runs from `--mcp-servers-config` (stdio): their
// tools come in llama-server's `/tools` listing with the type `mcp`. The core
// lists them as server tools until the MCP extension takes them over; then
// they are MCP tools, grouped per server and run on llama-server.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('#lib/services/database.service.ts', () => ({
	DatabaseService: {}
}));
// the component draws on the app's component barrel, which needs a browser
vi.mock('#lib/extensions/mcp/components/contributions/McpToolGroupIdentity.svelte', () => ({
	default: () => {}
}));

import { BuiltInTool, ServerToolType, ToolSource } from '#lib/enums/index.ts';
import type { ExtensionContext, ToolProvider } from '#lib/extensions/index.ts';
import { extensions } from '#lib/extensions/index.ts';
import { llamaServerMcpServers } from '#lib/extensions/mcp/llama-server.ts';
import { mcpStore } from '#lib/extensions/mcp/stores/index.svelte.ts';
import { contributeTools } from '#lib/extensions/mcp/tools.ts';
import { ToolsService } from '#lib/services/tools.service.ts';
import { agenticMode } from '#lib/stores/agentic-mode.svelte.ts';
import { toolsStore } from '#lib/stores/tools.svelte.ts';
import type { OpenAIToolDefinition, ServerToolInfo } from '#lib/types/index.ts';

const EXTENSION_ID = 'mcp-llama-server-test';

function info(tool: string, type: ServerToolType, mcpServer?: string): ServerToolInfo {
	return {
		definition: {
			function: { description: `${tool} tool`, name: tool, parameters: {} },
			type: 'function'
		},
		display_name: tool,
		...(mcpServer ? { mcp_server: mcpServer } : {}),
		permissions: { write: false },
		tool,
		type,
		uses_cwd: false
	};
}

// what a llama-server started with `--tools all --mcp-servers-config` lists
const LISTING: ServerToolInfo[] = [
	info(BuiltInTool.SERVER_READ_FILE, ServerToolType.SERVER),
	info('imcp_weather_current', ServerToolType.MCP, 'imcp'),
	info('imcp_contacts_search', ServerToolType.MCP, 'imcp'),
	info('my_fs_read', ServerToolType.MCP, 'my_fs')
];

interface ToolsStoreInternals {
	_serverToolInfos: ServerToolInfo[];
	_serverTools: OpenAIToolDefinition[];
}

function seedListing(listing: ServerToolInfo[]): void {
	const internals = toolsStore as unknown as ToolsStoreInternals;

	internals._serverToolInfos = listing;
	internals._serverTools = listing.map((i) => i.definition);
}

function provider(): ToolProvider {
	let made: ToolProvider | undefined;

	const ctx: ExtensionContext = {
		contribute: (point, contribution) => {
			if (point === 'tools') made = contribution as ToolProvider;
		},
		onDeactivate: () => {}
	};

	contributeTools(ctx);

	return made!;
}

function names(defs: OpenAIToolDefinition[]): string[] {
	return defs.map((def) => def.function.name);
}

extensions.register({
	description: "MCP's tools, as the extension contributes them",
	id: EXTENSION_ID,
	load: async () => ({ default: { activate: contributeTools } }),
	name: 'MCP'
});

beforeEach(() => {
	// as against a llama-server started with --agent
	agenticMode.serverHasTools = true;
	vi.restoreAllMocks();
	vi.spyOn(mcpStore, 'getServers').mockReturnValue([]);
	vi.spyOn(mcpStore, 'getConnections').mockReturnValue(new Map());
	seedListing(LISTING);
});

afterEach(async () => {
	await extensions.setEnabled(EXTENSION_ID, false);
	seedListing([]);

	for (const key of [...toolsStore.disabledTools]) toolsStore.setToolEnabled(key, true);
});

describe('llama-server MCP tools without the MCP extension', () => {
	it('stay server tools', () => {
		expect(names(toolsStore.serverTools)).toEqual([
			'read_file',
			'imcp_weather_current',
			'imcp_contacts_search',
			'my_fs_read'
		]);
		expect(toolsStore.getToolSource('imcp_weather_current')).toBe(ToolSource.SERVER);
		expect(toolsStore.getPermissionKey('imcp_weather_current')).toBe('server:imcp_weather_current');
	});
});

describe('llama-server MCP tools with the MCP extension', () => {
	beforeEach(() => extensions.setEnabled(EXTENSION_ID, true));

	it('leave the server tools for the MCP category', () => {
		expect(names(toolsStore.serverTools)).toEqual(['read_file']);
		expect(toolsStore.hasServerTools).toBe(true);
		expect(toolsStore.getToolSource('read_file')).toBe(ToolSource.SERVER);
		expect(toolsStore.getToolSource('imcp_weather_current')).toBe(ToolSource.MCP);
	});

	it('are grouped per server, under keys that cannot meet a configured server', () => {
		const group = toolsStore.toolGroups.find((g) => g.serverId === 'llama-server:imcp');

		expect(group).toMatchObject({ key: 'mcp:llama-server:imcp', label: 'imcp' });
		expect(group?.tools.map((t) => t.definition.function.name)).toEqual([
			'imcp_weather_current',
			'imcp_contacts_search'
		]);
		expect(toolsStore.getPermissionKey('imcp_weather_current')).toBe(
			'mcp-llama-server:imcp:imcp_weather_current'
		);
		expect(toolsStore.getToolServerLabel('my_fs_read')).toBe('my_fs');
	});

	it('are sent to the model once each, and not after their server is switched off', () => {
		const all = names(toolsStore.getEnabledToolsForLLM(new Set(), new Set()));

		expect(all.filter((n) => n === 'imcp_weather_current')).toHaveLength(1);
		expect(all).toContain('my_fs_read');

		const off = names(
			toolsStore.getEnabledToolsForLLM(new Set(['mcp:llama-server:imcp']), new Set())
		);

		expect(off).not.toContain('imcp_weather_current');
		expect(off).toContain('my_fs_read');
		expect(off).toContain('read_file');
	});

	it('run on llama-server, with the arguments the model wrote', async () => {
		const execute = vi
			.spyOn(ToolsService, 'executeTool')
			.mockResolvedValue({ content: 'sunny', isError: false });
		const executeOnMcp = vi.spyOn(mcpStore, 'executeTool');
		const result = await provider().execute({
			arguments: '{"city":"Kraków"}',
			id: 'call-1',
			name: 'imcp_weather_current'
		});

		expect(result).toEqual({ content: 'sunny', isError: false });
		expect(execute).toHaveBeenCalledWith('imcp_weather_current', { city: 'Kraków' }, undefined);
		expect(executeOnMcp).not.toHaveBeenCalled();

		await provider().execute({ arguments: 'not json', id: 'call-2', name: 'my_fs_read' });

		expect(execute).toHaveBeenLastCalledWith('my_fs_read', {}, undefined);
	});

	it('make the provider configured without any server of its own', () => {
		expect(provider().isConfigured()).toBe(true);

		seedListing([LISTING[0]]);

		expect(provider().isConfigured()).toBe(false);
	});
});

describe('the servers llama-server runs', () => {
	it('are named by llama-server, or by the tool name of an older llama-server', () => {
		seedListing([
			...LISTING,
			// no `mcp_server`: llama-server before the field, `<server>_<tool>`
			info('github_list_issues', ServerToolType.MCP)
		]);

		expect(llamaServerMcpServers().map((s) => [s.name, s.tools.length])).toEqual([
			['imcp', 2],
			['my_fs', 1],
			['github', 1]
		]);
	});
});
