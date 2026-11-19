/**
 * Signing in to MCP servers with the browser, from the moment the extension
 * is on: a page load that is an authorization server sending the browser back
 * finishes its sign-in, and a server whose sign-in finished (in this tab or a
 * popup) connects again with its new tokens.
 */

import type { ExtensionContext } from '../types';
import { mcpOAuthFlow } from './oauth/flow.svelte';
import { mcpStore } from './stores/index.svelte';
import { toast } from 'svelte-sonner';

/** How long a finished popup waits to close itself before saying it can be closed. */
const POPUP_CLOSE_GRACE_MS = 400;

export function contributeSignIn(ctx: ExtensionContext): void {
	const unsubscribe = mcpOAuthFlow.subscribe((result) => {
		if (!result.ok) return;

		const server = mcpStore.getServerById(result.serverId);

		if (server?.url.trim()) void mcpStore.runHealthCheck(server, true);
	});

	ctx.onDeactivate(unsubscribe);

	void mcpOAuthFlow.completeFromLocation().then((outcome) => {
		if (!outcome?.result) return;

		const { result } = outcome;

		if (outcome.closeWindow) {
			window.close();

			// a browser may keep a window its script did not open in this document: say so
			setTimeout(() => {
				if (result.ok) toast.success('Signed in. You can close this window.');
				else toast.error(`${result.error ?? 'The sign-in failed'}. You can close this window.`);
			}, POPUP_CLOSE_GRACE_MS);

			return;
		}

		if (!result.ok) toast.error(result.error ?? 'The sign-in failed');
	});
}
