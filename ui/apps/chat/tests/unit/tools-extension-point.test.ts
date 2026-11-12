// The tools store and the tool policy know tools from extensions only through
// the `tools` extension point: a provider's tools are listed, keyed, switched
// and labelled like the built-in ones, and are gone once the extension is off.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('$lib/services/database.service', () => ({
	DatabaseService: {}
}));

import { BuiltInTool, ToolSource } from '$lib/enums';
import type { Extension, ToolProvider } from '$lib/extensions';
import { extensions } from '$lib/extensions';
import { conversationsStore } from '$lib/stores/conversations/index.svelte';
import { toolsStore } from '$lib/stores/tools.svelte';
import type { OpenAIToolDefinition, ToolEntry, ToolGroup } from '$lib/types';

const SERVER_ID = 'srv-1';
const ICON_URL = 'https://example.com/favicon.ico';

function definition(name: string): OpenAIToolDefinition {
	return { function: { name, parameters: {} }, type: 'function' };
}

function makeProvider(overrides: Partial<ToolProvider> = {}): ToolProvider {
	return {
		entries: () => [
			{ definition: definition('search'), groupId: SERVER_ID, groupLabel: 'Docs' },
			{ definition: definition('fetch'), groupId: SERVER_ID, groupLabel: 'Docs' }
		],
		execute: async () => ({ content: '', isError: false }),
		groupIcon: (groupId) => (groupId === SERVER_ID ? ICON_URL : null),
		isConfigured: () => true,
		source: ToolSource.MCP,
		toolIcon: (toolName) => (toolName === 'search' ? ICON_URL : null),
		...overrides
	};
}

// the registry has no way to forget an extension, so every test registers its own
let nextExtensionId = 0;

const activeIds: string[] = [];

async function activate(extension: Extension): Promise<string> {
	const id = `tools-test-${nextExtensionId++}`;

	extensions.register({
		description: 'A test extension',
		id,
		load: async () => ({ default: extension }),
		name: id
	});
	await extensions.setEnabled(id, true);
	activeIds.push(id);

	return id;
}

function activateProvider(provider: ToolProvider = makeProvider()): Promise<string> {
	return activate({ activate: (ctx) => ctx.contribute('tools', provider) });
}

function entry(name: string): ToolEntry {
	return toolsStore.allTools.find((t) => t.definition.function.name === name)!;
}

function group(serverId: string): ToolGroup {
	return toolsStore.toolGroups.find((g) => g.serverId === serverId)!;
}

beforeEach(() => {
	vi.restoreAllMocks();
	(toolsStore as unknown as { _serverTools: OpenAIToolDefinition[] })._serverTools = [
		definition(BuiltInTool.SERVER_READ_FILE)
	];
	vi.spyOn(toolsStore, 'customTools', 'get').mockReturnValue([definition('my_tool')]);
});

afterEach(async () => {
	for (const id of activeIds.splice(0)) await extensions.setEnabled(id, false);

	(toolsStore as unknown as { _serverTools: OpenAIToolDefinition[] })._serverTools = [];

	for (const key of [...toolsStore.disabledTools]) toolsStore.setToolEnabled(key, true);
});

describe('tools from an extension', () => {
	// these strings are stored in localStorage and on conversation rows
	it('keeps the stored key formats', async () => {
		await activateProvider();

		const keys = toolsStore.allTools.map((t) => t.key);

		expect(keys).toContain('server:read_file');
		expect(keys).toContain('browser:get_datetime');
		expect(keys).toContain('mcp-srv-1:search');
		expect(keys).toContain('mcp-srv-1:fetch');
		expect(keys).toContain('custom:my_tool');
		expect(group(SERVER_ID).key).toBe('mcp:srv-1');
		expect(toolsStore.getGroupKey(ToolSource.MCP, SERVER_ID)).toBe('mcp:srv-1');
		expect(toolsStore.getToolKey(ToolSource.MCP, 'search', SERVER_ID)).toBe('mcp-srv-1:search');
		expect(toolsStore.getPermissionKey('search')).toBe('mcp-srv-1:search');
	});

	it('lists them with their group id and label', async () => {
		await activateProvider();

		expect(entry('search')).toMatchObject({
			serverId: SERVER_ID,
			serverName: 'Docs',
			source: ToolSource.MCP
		});
		expect(group(SERVER_ID)).toMatchObject({ label: 'Docs', source: ToolSource.MCP });
		expect(group(SERVER_ID).tools.map((t) => t.definition.function.name)).toEqual([
			'search',
			'fetch'
		]);
		expect(toolsStore.getToolSource('search')).toBe(ToolSource.MCP);
		expect(toolsStore.getToolServerLabel('search')).toBe('Docs');
	});

	it('sends them to the model after the server and browser tools, before the custom ones', async () => {
		await activateProvider();

		const names = toolsStore
			.getEnabledToolsForLLM(new Set(), new Set())
			.map((def) => def.function.name);

		expect(names[0]).toBe('read_file');
		expect(names.slice(-3)).toEqual(['search', 'fetch', 'my_tool']);
		expect(names.indexOf('get_datetime')).toBeLessThan(names.indexOf('search'));
	});

	it('switches a tool, its group or its category off', async () => {
		await activateProvider();

		const offered = (disabledTools: string[], disabledCategories: ToolSource[] = []) =>
			toolsStore
				.getEnabledToolsForLLM(new Set(disabledTools), new Set(disabledCategories))
				.map((def) => def.function.name);

		expect(offered(['mcp-srv-1:search'])).not.toContain('search');
		expect(offered(['mcp-srv-1:search'])).toContain('fetch');
		expect(offered(['mcp:srv-1'])).not.toContain('search');
		expect(offered(['mcp:srv-1'])).not.toContain('fetch');
		expect(offered([], [ToolSource.MCP])).not.toContain('fetch');
		expect(offered([], [ToolSource.MCP])).toContain('my_tool');
	});

	it('asks the provider for the icon of a group and of a tool call', async () => {
		await activateProvider();

		expect(toolsStore.getGroupIcon(group(SERVER_ID))).toBe(ICON_URL);
		expect(toolsStore.getGroupIcon(toolsStore.toolGroups[0])).toBeNull();
		expect(toolsStore.getToolIcon('search')).toBe(ICON_URL);
		expect(toolsStore.getToolIcon('fetch')).toBeNull();
		expect(toolsStore.getToolIcon(undefined)).toBeNull();
		expect(toolsStore.getGroupIdentity(group(SERVER_ID))).toBeNull();
	});

	it('toggles a group through the tool policy by its group key', async () => {
		await activateProvider();

		const preferences = conversationsStore.preferences;

		expect(preferences.isGroupChecked(group(SERVER_ID))).toBe(true);
		expect(preferences.isServerToolsEnabled(SERVER_ID)).toBe(true);
		expect(preferences.isToolParentDisabled(entry('search'))).toBe(false);

		await preferences.toggleGroup(group(SERVER_ID));

		expect([...toolsStore.disabledTools]).toEqual(['mcp:srv-1']);
		expect(preferences.isGroupChecked(group(SERVER_ID))).toBe(false);
		expect(preferences.isServerToolsEnabled(SERVER_ID)).toBe(false);
		expect(preferences.isToolParentDisabled(entry('search'))).toBe(true);
		expect(preferences.isToolActive(entry('search'))).toBe(false);
		// the tool's own key is untouched
		expect(preferences.isToolEnabled(entry('search').key)).toBe(true);

		await preferences.toggleServerTools(SERVER_ID);

		expect([...toolsStore.disabledTools]).toEqual([]);
		expect(preferences.isToolActive(entry('search'))).toBe(true);
	});

	it('enables several keys in one go', async () => {
		toolsStore.setToolEnabled('mcp:srv-1', false);
		toolsStore.setToolEnabled('mcp-srv-1:search', false);
		toolsStore.setToolEnabled('server:read_file', false);

		toolsStore.enableTools(['mcp:srv-1', 'mcp-srv-1:search']);

		expect([...toolsStore.disabledTools]).toEqual(['server:read_file']);
	});

	it('drops the tools once the extension is switched off', async () => {
		const id = await activateProvider();

		expect(toolsStore.getToolSource('search')).toBe(ToolSource.MCP);

		await extensions.setEnabled(id, false);

		expect(toolsStore.providers).toEqual([]);
		expect(toolsStore.getToolSource('search')).toBeNull();
		expect(toolsStore.getPermissionKey('search')).toBeNull();
		expect(toolsStore.getToolServerLabel('search')).toBe('');
		expect(toolsStore.getToolIcon('search')).toBeNull();
	});
});

describe('tools without any extension', () => {
	it('lists only the built-in categories', () => {
		const groups = toolsStore.toolGroups;

		expect(toolsStore.providers).toEqual([]);
		expect(groups.map((g) => g.source)).toEqual([
			ToolSource.SERVER,
			ToolSource.BROWSER,
			ToolSource.CUSTOM
		]);
		expect(groups.every((g) => g.serverId === undefined)).toBe(true);
		expect(groups.map((g) => g.key)).toEqual(['server', 'browser', 'custom']);
		expect(toolsStore.getGroupIcon(groups[0])).toBeNull();
		expect(toolsStore.getGroupIdentity(groups[0])).toBeNull();
	});

	it('toggles a category group by its category', async () => {
		const preferences = conversationsStore.preferences;
		const [serverGroup] = toolsStore.toolGroups;

		expect(preferences.isGroupChecked(serverGroup)).toBe(true);

		await preferences.toggleGroup(serverGroup);

		expect(preferences.isGroupChecked(serverGroup)).toBe(false);
		expect(preferences.isToolParentDisabled(entry('read_file'))).toBe(true);
		expect([...toolsStore.disabledTools]).toEqual([]);

		await preferences.toggleGroup(serverGroup);

		expect(preferences.isGroupChecked(serverGroup)).toBe(true);
	});
});
