import type { ExtensionContext } from '../types';
import { mcpStore } from './stores/index.svelte';
import { untrack } from 'svelte';

/**
 * Background MCP server health checks, from the moment the extension is on.
 * Health-check every configured server with a URL - including disabled ones -
 * so the /mcp-servers page can display health metadata for servers that are
 * currently turned off. Disabled servers never get promoted to active
 * connections (see runHealthCheck), so their tools/prompts/resources stay
 * out of the chat-side stores.
 * Only IDLE servers are checked; already-resolved (SUCCESS / ERROR) servers
 * keep their existing state, so adding or removing a server does not flash
 * every other card back through skeleton state.
 */
export function contributeStartup(ctx: ExtensionContext): void {
	// outside any component, so the effect needs a root of its own; it runs again when the server list changes
	const dispose = $effect.root(() => {
		$effect(() => {
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
	});

	ctx.onDeactivate(dispose);
}
