// The tools UI reads MCP only through the `tools` extension point: with the
// MCP extension on it shows the servers' tools as before, with it off it
// still renders, just without them.

import SettingsChatToolsTab from '$lib/components/app/settings/SettingsChat/SettingsChatToolsTab.svelte';
import {
	DISABLED_TOOL_CATEGORIES_LOCALSTORAGE_KEY,
	EXTENSIONS_LOCALSTORAGE_KEY
} from '$lib/constants';
import { ToolSource } from '$lib/enums';
import { BUILT_IN_EXTENSIONS } from '$lib/extensions/builtin';
import { extensions } from '$lib/extensions/registry.svelte';
import { useToolsPanel, type UseToolsPanelReturn } from '$lib/hooks/use-tools-panel.svelte';
import { conversationsStore } from '$lib/stores/conversations/index.svelte';
import { mcpStore } from '$lib/stores/mcp/index.svelte';
import { settingsStore } from '$lib/stores/settings/index.svelte';
import { toolsStore } from '$lib/stores/tools.svelte';
import type { MCPConnection } from '$lib/types';
import { flushSync, tick } from 'svelte';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';

const MCP_ID = 'mcp';
const SERVER_HINT =
	'To enable Server Tools you need to run llama-server with --tools all or --tools <name> flag.';
// the favicon fallback resolves to the root domain of the server url
const FAVICON = 'https://example.com/favicon.ico';

let serverId = '';

function withPanel(run: (panel: UseToolsPanelReturn) => void): void {
	const stop = $effect.root(() => {
		const panel = useToolsPanel();

		flushSync();
		run(panel);
	});

	stop();
}

beforeAll(() => {
	for (const manifest of BUILT_IN_EXTENSIONS) extensions.register(manifest);
});

beforeEach(async () => {
	settingsStore.updateConfig('mcpServers', '[]');
	serverId = mcpStore.addServer({
		displayName: 'Docs',
		enabled: true,
		url: 'https://mcp.example.com/mcp'
	}).id;
	vi.spyOn(mcpStore, 'getConnections').mockReturnValue(
		new Map([[serverId, { tools: [{ name: 'search' }] } as unknown as MCPConnection]])
	);
	await extensions.setEnabled(MCP_ID, true);
});

afterEach(() => {
	vi.restoreAllMocks();
});

afterAll(async () => {
	await extensions.setEnabled(MCP_ID, false);
	settingsStore.updateConfig('mcpServers', '[]');
	localStorage.removeItem(EXTENSIONS_LOCALSTORAGE_KEY);
	localStorage.removeItem(DISABLED_TOOL_CATEGORIES_LOCALSTORAGE_KEY);
});

describe('tools settings', () => {
	it('draws an MCP server group with its icon while the MCP extension is on', async () => {
		render(SettingsChatToolsTab);
		await tick();

		expect(document.body.textContent).toContain('Docs');
		expect(document.body.textContent).toContain('Browser');
		expect(document.querySelector(`img[src="${FAVICON}"]`)).not.toBeNull();
	});

	it('renders without the MCP groups once the extension is off', async () => {
		render(SettingsChatToolsTab);
		await extensions.setEnabled(MCP_ID, false);
		await tick();

		expect(document.body.textContent).not.toContain('Docs');
		expect(document.body.textContent).toContain('Browser');
		expect(document.querySelector(`img[src="${FAVICON}"]`)).toBeNull();
	});
});

describe('tools panel', () => {
	it('keeps the MCP server groups apart from the category groups', () => {
		withPanel((panel) => {
			const [group] = panel.providerGroups;

			expect(panel.providerGroups).toHaveLength(1);
			expect(group).toMatchObject({ key: `mcp:${serverId}`, label: 'Docs' });
			expect(panel.categoryGroups.map((g) => g.source)).toEqual([ToolSource.BROWSER]);
			expect(panel.getFavicon(group)).toBe(FAVICON);
			expect(panel.getFavicon(panel.categoryGroups[0])).toBeNull();
			expect(panel.isGroupDisabled(group)).toBe(false);
		});
	});

	it('grays an MCP server group out while the MCP category is off', async () => {
		await conversationsStore.preferences.toggleCategory(ToolSource.MCP);

		withPanel((panel) => {
			expect(panel.isGroupDisabled(panel.providerGroups[0])).toBe(true);
			expect(panel.isGroupDisabled(panel.categoryGroups[0])).toBe(false);
		});

		await conversationsStore.preferences.toggleCategory(ToolSource.MCP);
	});

	it('checks the MCP servers again when it opens', () => {
		const run = vi.spyOn(mcpStore, 'runHealthChecksForServers').mockResolvedValue();

		vi.spyOn(toolsStore, 'fetchServerTools').mockResolvedValue();
		withPanel((panel) => panel.handleOpen());

		expect(run).toHaveBeenCalledOnce();
		expect(run.mock.calls[0][0].map((server) => server.id)).toEqual([serverId]);
	});

	it('explains how to get MCP tools while there is no tool to list', () => {
		vi.spyOn(toolsStore, 'toolGroups', 'get').mockReturnValue([]);

		withPanel((panel) => {
			expect(panel.noToolsInfoMessage).toBe(
				`${SERVER_HINT} To see MCP Tools you need to add / enable MCP Server(s).`
			);
			expect(panel.providerHints).toEqual([
				{
					action: 'Enable MCP Server(s) to access',
					sentence: 'To see MCP Tools you need to add / enable MCP Server(s).',
					toolsLabel: 'MCP Tools'
				}
			]);
		});
	});

	it('works without the MCP extension', async () => {
		await extensions.setEnabled(MCP_ID, false);
		vi.spyOn(toolsStore, 'fetchServerTools').mockResolvedValue();

		withPanel((panel) => {
			expect(panel.providerGroups).toEqual([]);
			expect(panel.providerHints).toEqual([]);
			expect(panel.categoryGroups.map((g) => g.source)).toEqual([ToolSource.BROWSER]);
			expect(() => panel.handleOpen()).not.toThrow();
		});

		vi.spyOn(toolsStore, 'toolGroups', 'get').mockReturnValue([]);

		withPanel((panel) => expect(panel.noToolsInfoMessage).toBe(SERVER_HINT));
	});
});
