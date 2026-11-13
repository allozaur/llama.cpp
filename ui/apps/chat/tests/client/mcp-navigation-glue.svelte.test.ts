// What the MCP extension gives the sidebar, the page route and startup: its
// entry right after Models, the MCP servers page that entry leads to,
// and the background health checks, which stop when the extension goes off,
// when the live connections close too.

import { ROUTES, SETTINGS_KEYS, SIDEBAR_FOOTER_ITEMS } from '$lib/constants';
import type { ExtensionContext, ExtensionPage, NavigationItem } from '$lib/extensions';
import { contributeNavigation } from '$lib/extensions/mcp/navigation';
import { contributePages } from '$lib/extensions/mcp/pages';
import { contributeStartup } from '$lib/extensions/mcp/startup.svelte';
import { mcpStore } from '$lib/extensions/mcp/stores/index.svelte';
import { RouterService } from '$lib/services/router.service';
import { settingsStore } from '$lib/stores/settings/index.svelte';
import { sidebarFooterItems } from '$lib/utils';
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

describe('MCP navigation glue', () => {
	it('contributes the MCP entry, which the sidebar places right after Models', () => {
		const { contributions, ctx } = makeContext();

		contributeNavigation(ctx);

		expect(contributions).toHaveLength(1);
		expect(contributions[0].point).toBe('navigation');

		const item = contributions[0].value as NavigationItem;

		expect(item).toMatchObject({
			id: 'mcp',
			placement: 'footer',
			route: ROUTES.MCP_SERVERS,
			tooltip: 'MCP'
		});
		expect(item.dialog).toBeDefined();
		expect(item.icon).toBeDefined();
		expect(item.keys).toBeUndefined();
		expect(sidebarFooterItems([item]).map((entry) => entry.tooltip)).toEqual([
			'Models',
			'MCP',
			...SIDEBAR_FOOTER_ITEMS.slice(1).map((entry) => entry.tooltip)
		]);
	});

	it('contributes the MCP servers page at the route its entry opens', () => {
		const { contributions, ctx } = makeContext();

		contributePages(ctx);

		expect(contributions).toHaveLength(1);
		expect(contributions[0].point).toBe('pages');

		const mcpPage = contributions[0].value as ExtensionPage;

		expect(mcpPage.title).toBe('MCP Servers');
		expect(mcpPage.component).toBeDefined();
		expect(RouterService.extensionPage(mcpPage.path)).toBe(ROUTES.MCP_SERVERS);
	});

	it('health-checks every server with a URL, again when the list changes, until deactivated', async () => {
		const original = settingsStore.config[SETTINGS_KEYS.MCP_SERVERS];
		const runHealthChecks = vi
			.spyOn(mcpStore, 'runHealthChecksForServers')
			.mockResolvedValue(undefined);
		const shutdown = vi.spyOn(mcpStore, 'shutdown').mockResolvedValue();
		const { cleanups, ctx } = makeContext();

		try {
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
		}
	});
});
