import { extensions } from '../registry.svelte';
import type { ExtensionContext } from '../types';
import { mcpStore } from './stores/index.svelte';
import { untrack } from 'svelte';

/** Joins the connectors' accounts into one value to compare. */
const ACCOUNTS_SEPARATOR = '\n';

/**
 * Background MCP server health checks, from the moment the extension is on.
 * Health-check every configured server with a URL - including disabled ones -
 * so the MCP servers dialog can display health metadata for servers that are
 * currently turned off. Disabled servers never get promoted to active
 * connections (see runHealthCheck), so their tools/prompts/resources stay
 * out of the chat-side stores.
 * Only IDLE servers are checked; already-resolved (SUCCESS / ERROR) servers
 * keep their existing state, so adding or removing a server does not flash
 * every other card back through skeleton state.
 * When the extension is switched off the checks stop and the live
 * connections are closed.
 */
export function contributeStartup(ctx: ExtensionContext): void {
	// cleanups run last-in first-out: the checks stop first, then the connections close
	ctx.onDeactivate(() => mcpStore.shutdown());

	// outside any component, so the effects need a root of their own
	const dispose = $effect.root(() => {
		// runs again when the server list changes
		$effect(() => {
			// Enable MCP off: no server is checked or connected, open connections close
			if (!mcpStore.isFeatureEnabled) {
				untrack(() => void mcpStore.shutdown());

				return;
			}

			const mcpServers = mcpStore.getServers();
			const serversWithUrls = mcpServers.filter((s) => s.url.trim());

			if (serversWithUrls.length > 0) {
				untrack(() => {
					// Run health checks in background (don't await)
					mcpStore.runHealthChecksForServers(serversWithUrls, true).catch((error) => {
						console.warn('[mcp] MCP health checks failed:', error);
					});
				});
			}
		});

		// a server shows other tools to an account than to a guest: when the account of a
		// connector changes, the servers connect again
		let accounts: string | undefined;

		$effect(() => {
			const next = extensions
				.contributions('serverAuth')
				.map((connector) => connector.account() ?? '')
				.join(ACCOUNTS_SEPARATOR);
			const isFirstRun = accounts === undefined;
			const hasChanged = next !== accounts;

			accounts = next;

			if (isFirstRun || !hasChanged) return;

			untrack(() => {
				// Enable MCP off: the effect above keeps every connection closed
				if (!mcpStore.isFeatureEnabled) return;

				void mcpStore.shutdown().then(() =>
					mcpStore.runHealthChecksForServers(
						mcpStore.getServers().filter((server) => server.url.trim()),
						false
					)
				);
			});
		});
	});

	ctx.onDeactivate(dispose);
}
