// The Extensions section of the settings switches an extension on and off, at
// once: with MCP off its sidebar entry, the `/prompt` command and its tools are
// gone and its connections close; switched on again they are back. The choice
// is stored, so a reload keeps it.

import SidebarNavigationFooter from '$lib/components/app/navigation/SidebarNavigation/SidebarNavigationFooter.svelte';
import SettingsChatExtensionsTab from '$lib/components/app/settings/SettingsChat/SettingsChatExtensionsTab.svelte';
import { EXTENSIONS_LOCALSTORAGE_KEY, SETTINGS_KEYS, SIDEBAR_FOOTER_ITEMS } from '$lib/constants';
import { ToolSource } from '$lib/enums';
import { ExtensionRegistry, extensions } from '$lib/extensions';
import { BUILT_IN_EXTENSIONS } from '$lib/extensions/builtin';
import { mcpStore } from '$lib/extensions/mcp/stores/index.svelte';
import { uiStore } from '$lib/stores';
import { settingsStore } from '$lib/stores/settings/index.svelte';
import { toolsStore } from '$lib/stores/tools.svelte';
import type { MCPConnection, MCPResourceInfo } from '$lib/types';
import { getChatCommands } from '$lib/utils';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';

const MCP_ID = 'mcp';
/** The labels of the footer's own items, in order. */
const FOOTER = SIDEBAR_FOOTER_ITEMS.map((item) => item.tooltip);
const RESOURCE: MCPResourceInfo = {
	name: 'README.md',
	serverName: 'docs',
	uri: 'repo://ggml-org/llama.cpp/README.md'
};

/** Labels of the sidebar footer's rows, in order. */
function footerLabels(container: Element): string[] {
	return [...container.querySelectorAll<HTMLElement>('[data-slot="button"]')]
		.map((row) => row.querySelector('span span')?.textContent?.trim() ?? '')
		.filter((label) => label !== '');
}

/** The slash commands as the chat form lists them. */
function commandNames(): string[] {
	return getChatCommands(
		{ canCompact: () => false, hasCwdTools: () => false, showModelSelector: false },
		extensions.contributions('composerCommands')
	).map((command) => command.name);
}

function mcpToolNames(): string[] {
	return toolsStore.allTools
		.filter((tool) => tool.source === ToolSource.MCP)
		.map((tool) => tool.definition.function.name);
}

function storedChoices(): unknown {
	return JSON.parse(localStorage.getItem(EXTENSIONS_LOCALSTORAGE_KEY) ?? 'null');
}

/** The registry a reloaded app starts with: the same extensions, the choices read from storage. */
async function reloadedRegistry(): Promise<ExtensionRegistry> {
	const registry = new ExtensionRegistry();

	for (const manifest of BUILT_IN_EXTENSIONS) registry.register(manifest);

	await registry.activateEnabled();

	return registry;
}

describe('Extensions settings', () => {
	let wasExpanded: boolean;

	beforeAll(() => {
		localStorage.removeItem(EXTENSIONS_LOCALSTORAGE_KEY);

		for (const manifest of BUILT_IN_EXTENSIONS) extensions.register(manifest);
	});

	beforeEach(async () => {
		await page.viewport(1280, 900);
		wasExpanded = uiStore.isSidebarExpanded;
		uiStore.isSidebarExpanded = true;

		settingsStore.updateConfig(SETTINGS_KEYS.MCP_SERVERS, '[]');

		const serverId = mcpStore.addServer({
			displayName: 'Docs',
			enabled: true,
			url: 'https://mcp.example.com/mcp'
		}).id;

		// no network: the server is "connected" with one tool
		vi.spyOn(mcpStore, 'runHealthChecksForServers').mockResolvedValue();
		vi.spyOn(mcpStore, 'getConnections').mockReturnValue(
			new Map([[serverId, { tools: [{ name: 'search' }] } as unknown as MCPConnection]])
		);
		vi.spyOn(mcpStore, 'shutdown').mockResolvedValue();

		// every test starts with MCP on, as a fresh app does
		await extensions.setEnabled(MCP_ID, true);
	});

	afterEach(async () => {
		await extensions.setEnabled(MCP_ID, false);
		vi.restoreAllMocks();
		mcpStore.resources.clearAttachments();
		settingsStore.updateConfig(SETTINGS_KEYS.MCP_SERVERS, '[]');
		localStorage.removeItem(EXTENSIONS_LOCALSTORAGE_KEY);
		uiStore.isSidebarExpanded = wasExpanded;
	});

	afterAll(() => {
		localStorage.removeItem(EXTENSIONS_LOCALSTORAGE_KEY);
	});

	it('lists MCP with its description, switched on', async () => {
		const screen = render(SettingsChatExtensionsTab);

		await expect.element(screen.getByRole('switch', { name: 'MCP' })).toBeChecked();
		await expect
			.element(
				screen.getByText('Connect MCP servers and use their tools, prompts and resources in chats.')
			)
			.toBeVisible();
		expect(screen.container.querySelector('[role="alert"]')).toBeNull();
	});

	it('takes MCP out of the sidebar, the commands and the tools, and puts it back', async () => {
		const settings = render(SettingsChatExtensionsTab);
		const sidebar = render(SidebarNavigationFooter, {});
		const mcpSwitch = settings.getByRole('switch', { name: 'MCP' });

		await vi.waitFor(() =>
			expect(footerLabels(sidebar.container)).toEqual(['Models', 'MCP', ...FOOTER.slice(1)])
		);
		expect(commandNames()).toEqual(['prompt', 'cwd', 'model', 'compact']);
		expect(mcpToolNames()).toEqual(['search']);

		mcpStore.resources.addAttachment(RESOURCE);

		await mcpSwitch.click();

		await expect.element(mcpSwitch).not.toBeChecked();
		await vi.waitFor(() => expect(footerLabels(sidebar.container)).toEqual(FOOTER));
		expect(commandNames()).toEqual(['cwd', 'model', 'compact']);
		expect(mcpToolNames()).toEqual([]);
		// the live connections close and the resources waiting in the chat form are dropped
		expect(mcpStore.shutdown).toHaveBeenCalledOnce();
		expect(mcpStore.resources.hasAttachments).toBe(false);
		expect(extensions.extensions.find((e) => e.id === MCP_ID)).toMatchObject({
			enabled: false,
			state: 'inactive'
		});

		await mcpSwitch.click();

		await expect.element(mcpSwitch).toBeChecked();
		await vi.waitFor(() =>
			expect(footerLabels(sidebar.container)).toEqual(['Models', 'MCP', ...FOOTER.slice(1)])
		);
		expect(commandNames()).toEqual(['prompt', 'cwd', 'model', 'compact']);
		expect(mcpToolNames()).toEqual(['search']);
	});

	it('keeps the choice over a reload', async () => {
		const settings = render(SettingsChatExtensionsTab);
		const mcpSwitch = settings.getByRole('switch', { name: 'MCP' });

		await mcpSwitch.click();
		await expect.element(mcpSwitch).not.toBeChecked();

		expect(storedChoices()).toEqual({ [MCP_ID]: false });

		const off = await reloadedRegistry();

		expect(off.extensions).toMatchObject([{ enabled: false, id: MCP_ID, state: 'inactive' }]);
		expect(off.contributions('navigation')).toEqual([]);
		expect(off.contributions('tools')).toEqual([]);

		const reloadedSettings = render(SettingsChatExtensionsTab, { registry: off });

		await expect.element(reloadedSettings.getByRole('switch', { name: 'MCP' })).not.toBeChecked();

		await mcpSwitch.click();
		await expect.element(mcpSwitch).toBeChecked();

		expect(storedChoices()).toEqual({ [MCP_ID]: true });

		const on = await reloadedRegistry();

		try {
			expect(on.extensions).toMatchObject([{ enabled: true, id: MCP_ID, state: 'active' }]);
			expect(on.contributions('navigation')).toHaveLength(1);
		} finally {
			await on.setEnabled(MCP_ID, false);
		}
	});

	it('says why an extension did not start, and tries again when switched off and on', async () => {
		const registry = new ExtensionRegistry();

		let attempts = 0;

		registry.register({
			description: 'Fails the first time it loads.',
			id: 'settings-extensions-flaky',
			load: async () => {
				attempts++;

				if (attempts === 1) throw new Error('chunk did not load');

				return { default: { activate: () => {} } };
			},
			name: 'Flaky'
		});

		vi.spyOn(console, 'error').mockImplementation(() => {});
		await registry.activateEnabled();

		const screen = render(SettingsChatExtensionsTab, { registry });
		const flaky = screen.getByRole('switch', { name: 'Flaky' });

		await expect.element(flaky).toBeChecked();
		await expect
			.element(screen.getByRole('alert'))
			.toHaveTextContent(
				'Flaky did not start: chunk did not load. Switch it off and on to try again.'
			);

		await flaky.click();
		await expect.element(flaky).not.toBeChecked();
		expect(screen.container.querySelector('[role="alert"]')).toBeNull();

		await flaky.click();
		await expect.element(flaky).toBeChecked();
		await vi.waitFor(() => expect(registry.extensions[0].state).toBe('active'));
		expect(screen.container.querySelector('[role="alert"]')).toBeNull();
	});
});
