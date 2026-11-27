// What the MCP extension gives Settings and startup: Manage MCP servers under
// the Enable MCP setting, and the background health checks, which stop when
// the extension goes off, when the live connections close too, and while
// Enable MCP is off.

import { MANAGE_MCP_SERVERS_LABEL, SETTINGS_KEYS } from '#lib/constants/index.ts';
import type { ExtensionContext, SettingsAction } from '#lib/extensions/index.ts';
import { contributeSettings } from '#lib/extensions/mcp/settings.ts';
import { contributeStartup } from '#lib/extensions/mcp/startup.svelte.ts';
import { mcpStore } from '#lib/extensions/mcp/stores/index.svelte.ts';
import { settingsStore } from '#lib/stores/settings/index.svelte.ts';
import { flushSync } from 'svelte';
import { describe, expect, it, vi } from 'vitest';

function makeContext() {
	const cleanups: (() => void | Promise<void>)[] = [];
	const contributions: { point: string; value: unknown }[] = [];
	const ctx: ExtensionContext = {
		contribute: (point, value) => void contributions.push({ point, value }),
		onDeactivate: (cleanup) => void cleanups.push(cleanup)
	};

	return { cleanups, contributions, ctx };
}

function setServers(servers: { enabled: boolean; id: string; url: string }[]) {
	settingsStore.updateConfig(SETTINGS_KEYS.MCP_SERVERS, JSON.stringify(servers));
	flushSync();
}

describe('MCP settings glue', () => {
	it('contributes Manage MCP servers under the Enable MCP setting', () => {
		const { contributions, ctx } = makeContext();

		contributeSettings(ctx);

		expect(contributions).toHaveLength(1);
		expect(contributions[0].point).toBe('settingsActions');

		const action = contributions[0].value as SettingsAction;

		expect(action).toMatchObject({
			label: MANAGE_MCP_SERVERS_LABEL,
			settingKey: SETTINGS_KEYS.ENABLE_MCP,
			title: 'MCP servers'
		});
		expect(action.dialog).toBeDefined();
		expect(action.icon).toBeDefined();
		expect(action.page).toBeDefined();
	});

	it('health-checks every server with a URL, again when the list changes, until deactivated', async () => {
		const original = settingsStore.config[SETTINGS_KEYS.MCP_SERVERS];
		const wasEnabled = settingsStore.config[SETTINGS_KEYS.ENABLE_MCP];
		const runHealthChecks = vi
			.spyOn(mcpStore, 'runHealthChecksForServers')
			.mockResolvedValue(undefined);
		const shutdown = vi.spyOn(mcpStore, 'shutdown').mockResolvedValue();
		const { cleanups, ctx } = makeContext();

		try {
			settingsStore.updateConfig(SETTINGS_KEYS.ENABLE_MCP, true);
			setServers([
				{ enabled: true, id: 'on', url: 'http://localhost:9001/mcp' },
				{ enabled: false, id: 'off', url: 'http://localhost:9002/mcp' },
				{ enabled: true, id: 'blank', url: '  ' }
			]);
			runHealthChecks.mockClear();

			contributeStartup(ctx);
			flushSync();

			// disabled servers too, so their cards show health; none without a URL
			expect(runHealthChecks).toHaveBeenCalledTimes(1);
			expect(runHealthChecks.mock.calls[0][0].map((server) => server.id)).toEqual(['on', 'off']);
			expect(runHealthChecks.mock.calls[0][1]).toBe(true);

			setServers([{ enabled: true, id: 'new', url: 'http://localhost:9003/mcp' }]);

			expect(runHealthChecks).toHaveBeenCalledTimes(2);
			expect(runHealthChecks.mock.calls[1][0].map((server) => server.id)).toEqual(['new']);

			// nothing to check, nothing run
			setServers([]);

			expect(runHealthChecks).toHaveBeenCalledTimes(2);

			// the registry runs the cleanups last-in first-out: the checks stop, then the connections close
			expect(cleanups).toHaveLength(2);
			expect(shutdown).not.toHaveBeenCalled();

			for (const cleanup of [...cleanups].reverse()) await cleanup();

			expect(shutdown).toHaveBeenCalledOnce();

			setServers([{ enabled: true, id: 'late', url: 'http://localhost:9004/mcp' }]);

			expect(runHealthChecks).toHaveBeenCalledTimes(2);
		} finally {
			runHealthChecks.mockRestore();
			shutdown.mockRestore();
			settingsStore.updateConfig(SETTINGS_KEYS.MCP_SERVERS, original);
			settingsStore.updateConfig(SETTINGS_KEYS.ENABLE_MCP, wasEnabled);
		}
	});

	it('checks no server and closes the connections while Enable MCP is off', async () => {
		const original = settingsStore.config[SETTINGS_KEYS.MCP_SERVERS];
		const wasEnabled = settingsStore.config[SETTINGS_KEYS.ENABLE_MCP];
		const runHealthChecks = vi
			.spyOn(mcpStore, 'runHealthChecksForServers')
			.mockResolvedValue(undefined);
		const shutdown = vi.spyOn(mcpStore, 'shutdown').mockResolvedValue(undefined);
		const { cleanups, ctx } = makeContext();

		try {
			settingsStore.updateConfig(SETTINGS_KEYS.ENABLE_MCP, false);
			setServers([{ enabled: true, id: 'on', url: 'http://localhost:9001/mcp' }]);
			runHealthChecks.mockClear();
			shutdown.mockClear();

			contributeStartup(ctx);
			flushSync();

			expect(runHealthChecks).not.toHaveBeenCalled();
			expect(shutdown).toHaveBeenCalled();

			settingsStore.updateConfig(SETTINGS_KEYS.ENABLE_MCP, true);
			flushSync();

			expect(runHealthChecks).toHaveBeenCalledTimes(1);
		} finally {
			for (const cleanup of cleanups) await cleanup();

			runHealthChecks.mockRestore();
			shutdown.mockRestore();
			settingsStore.updateConfig(SETTINGS_KEYS.MCP_SERVERS, original);
			settingsStore.updateConfig(SETTINGS_KEYS.ENABLE_MCP, wasEnabled);
		}
	});
});
