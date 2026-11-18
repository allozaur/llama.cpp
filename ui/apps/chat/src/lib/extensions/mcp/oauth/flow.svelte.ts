/**
 * Signing in to an MCP server with the browser: the sign-in the user starts,
 * the callback that finishes it, and sign-out.
 *
 * A sign-in opens the authorization page in a popup, or in this tab when the
 * popup is blocked. The authorization server sends the browser back to the
 * app's root with the code; that page load (the popup, or this tab) exchanges
 * it for tokens. The UI is served cross-origin isolated (COOP same-origin), so
 * the popup cannot reach the tab that opened it: the result goes out on a
 * BroadcastChannel to every tab of the app.
 */

import { MCPService } from '../services/mcp.service';
import { mcpOAuthFetch } from './fetch';
import { MCP_OAUTH_CALLBACK_PARAM, McpOAuthProvider, mcpOAuthRedirectUrl } from './provider';
import { McpOAuthFlowMode, mcpOAuthStorage } from './storage.svelte';
import type { FetchLike } from '@modelcontextprotocol/client';
import { SvelteMap, SvelteSet } from 'svelte/reactivity';

const CHANNEL_NAME = 'llama-mcp-oauth';
/** The callback's own query parameters, cleared from the address once read. */
const CALLBACK_PARAMS = [
	MCP_OAUTH_CALLBACK_PARAM,
	'code',
	'state',
	'iss',
	'error',
	'error_description',
	'error_uri'
];

/** The server a sign-in is for. */
export interface McpOAuthServer {
	id: string;
	url: string;
	useProxy?: boolean;
}

/** How a sign-in ended, as every tab hears it. */
export interface McpOAuthResult {
	error?: string;
	ok: boolean;
	serverId: string;
}

/** What a page load that came back from an authorization page did. */
export interface McpOAuthCallbackOutcome {
	/** The window was a sign-in popup: it is done and can close. */
	closeWindow: boolean;
	result: McpOAuthResult | null;
}

/** A plain sentence for an OAuth error code the authorization page sent back. */
function describeAuthorizationError(code: string): string {
	if (code === 'access_denied') return 'The sign-in was cancelled or refused';

	return `The authorization server refused the sign-in (${code.replace(/[^\w.-]/g, '').slice(0, 64)})`;
}

function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

class McpOAuthFlow {
	private channel: BroadcastChannel | null = null;
	private readonly errors = new SvelteMap<string, string>();
	private readonly listeners = new Set<(result: McpOAuthResult) => void>();
	private readonly manualClientRequired = new SvelteSet<string>();
	private readonly signingIn = new SvelteSet<string>();
	private readonly signInRequired = new SvelteSet<string>();

	/** Stop waiting for a sign-in the user gave up on, e.g. by closing the popup. */
	cancelSignIn(serverId: string): void {
		this.signingIn.delete(serverId);
	}

	clearSignInRequired(serverId: string): void {
		this.signInRequired.delete(serverId);
	}

	/**
	 * Finish a sign-in when this page load is the authorization server sending
	 * the browser back. Reads and clears the callback's parameters; returns
	 * null for any other page load.
	 */
	async completeFromLocation(
		location: URL = new URL(window.location.href)
	): Promise<McpOAuthCallbackOutcome | null> {
		if (!location.searchParams.has(MCP_OAUTH_CALLBACK_PARAM)) return null;

		const params = new URLSearchParams(location.search);
		const cleaned = new URL(location.href);

		for (const name of CALLBACK_PARAMS) cleaned.searchParams.delete(name);

		// a reload must not run the exchange again
		window.history.replaceState(window.history.state, '', cleaned.href);

		const state = params.get('state');
		const found = state ? mcpOAuthStorage.findByState(state) : undefined;
		const pending = found?.record.pending;

		if (!found || !pending) {
			console.warn(
				'[MCP OAuth] A sign-in came back that this browser did not start, or already finished'
			);

			return { closeWindow: false, result: null };
		}

		const { record, serverId } = found;
		const closeWindow = pending.mode === McpOAuthFlowMode.POPUP;
		const failure = params.get('error');

		let result: McpOAuthResult;

		if (failure) {
			mcpOAuthStorage.update(serverId, record.serverUrl, record.redirectUrl, (current) => ({
				...current,
				pending: undefined
			}));
			// only the error code: its description comes from the address bar, anyone could have written it
			result = { error: describeAuthorizationError(failure), ok: false, serverId };
		} else {
			result = await this.exchangeCode(serverId, record.serverUrl, params, pending.useProxy, {
				mode: pending.mode,
				returnUrl: pending.returnUrl
			});
		}

		this.publish(result);

		// a sign-in that took over this tab goes back to where it started: a navigation, not a
		// history entry rewrite, so the hash router follows it to the route
		if (!closeWindow) window.location.replace(pending.returnUrl);

		return { closeWindow, result };
	}

	/** The error the last sign-in of a server ended with, if it failed. */
	errorFor(serverId: string): string | null {
		return this.errors.get(serverId) ?? null;
	}

	/** Whether the browser holds tokens for the server at this URL. */
	isSignedIn(server: McpOAuthServer): boolean {
		return mcpOAuthStorage.get(server.id, server.url, mcpOAuthRedirectUrl())?.tokens !== undefined;
	}

	/** Whether a sign-in of the server is under way, waiting for the authorization page. */
	isSigningIn(serverId: string): boolean {
		return this.signingIn.has(serverId);
	}

	/** The host of the server's authorization server, once discovery found it. */
	issuerHost(server: McpOAuthServer): string | null {
		const discovered = mcpOAuthStorage.get(server.id, server.url, mcpOAuthRedirectUrl())
			?.discoveryState?.authorizationServerUrl;

		try {
			return discovered ? new URL(discovered).host : null;
		} catch {
			return null;
		}
	}

	markSignInRequired(serverId: string): void {
		this.signInRequired.add(serverId);
	}

	/**
	 * Whether the server's authorization server registers no apps on its own:
	 * signing in needs the client ID of an app the user registered there.
	 */
	needsClientId(serverId: string): boolean {
		return this.manualClientRequired.has(serverId);
	}

	/** Whether the server's last connection stopped at a sign-in. */
	needsSignIn(serverId: string): boolean {
		return this.signInRequired.has(serverId);
	}

	/**
	 * Start a sign-in. Call it from the click that asks for it, with the popup
	 * opened in that same click (browsers block a popup opened later); without
	 * one, this tab goes to the authorization page itself.
	 */
	async signIn(server: McpOAuthServer, popup: Window | null): Promise<void> {
		const useProxy = server.useProxy ?? false;
		const mode = popup ? McpOAuthFlowMode.POPUP : McpOAuthFlowMode.REDIRECT;
		const provider = new McpOAuthProvider({
			interactive: {
				mode,
				navigate: (authorizationUrl) => {
					if (popup) popup.location.href = authorizationUrl.href;
					else window.location.assign(authorizationUrl.href);
				},
				returnUrl: window.location.href
			},
			serverId: server.id,
			serverUrl: server.url,
			useProxy
		});

		this.errors.delete(server.id);
		this.signingIn.add(server.id);

		try {
			// the SDK loads on demand, see MCPService.loadSdk
			const { auth } = await MCPService.loadSdk();
			const outcome = await auth(provider, {
				fetchFn: mcpOAuthFetch(useProxy),
				serverUrl: server.url
			});

			// tokens it could refresh: no page to visit
			if (outcome === 'AUTHORIZED') {
				popup?.close();
				this.publish({ ok: true, serverId: server.id });
			}
		} catch (error) {
			popup?.close();

			const sdk = await MCPService.loadSdk().catch(() => null);

			// no registration endpoint, or one that turned the app down: the user's own app it is
			if (
				(sdk && error instanceof sdk.RegistrationRejectedError) ||
				/dynamic client registration/i.test(errorMessage(error))
			) {
				this.manualClientRequired.add(server.id);
				this.publish({
					error:
						'This server does not register apps by itself: enter the client ID of an app you registered with it',
					ok: false,
					serverId: server.id
				});

				return;
			}

			this.publish({ error: errorMessage(error), ok: false, serverId: server.id });
		}
	}

	/** Forget the server's tokens, revoking them where the authorization server allows it. */
	async signOut(server: McpOAuthServer): Promise<void> {
		const redirectUrl = mcpOAuthRedirectUrl();
		const record = mcpOAuthStorage.get(server.id, server.url, redirectUrl);

		if (!record?.tokens) return;

		// RFC 7009, which OpenID provider metadata does not list: read it from the raw metadata
		const metadata = record.discoveryState?.authorizationServerMetadata as
			| { revocation_endpoint?: unknown }
			| undefined;
		const endpoint =
			typeof metadata?.revocation_endpoint === 'string' ? metadata.revocation_endpoint : undefined;

		if (endpoint && record.clientInformation) {
			await this.revoke(
				endpoint,
				record.tokens.refresh_token ?? record.tokens.access_token,
				record.tokens.refresh_token ? 'refresh_token' : 'access_token',
				record.clientInformation,
				mcpOAuthFetch(server.useProxy ?? false)
			);
		}

		// the client registration stays: the next sign-in reuses it
		mcpOAuthStorage.update(server.id, server.url, redirectUrl, (current) => ({
			...current,
			pending: undefined,
			tokens: undefined
		}));
	}

	/**
	 * Hear how sign-ins end, in this tab and in the others (a popup finishes
	 * its sign-in in a tab of its own). Returns the function that stops.
	 */
	subscribe(listener: (result: McpOAuthResult) => void): () => void {
		this.listeners.add(listener);
		this.openChannel();

		return () => {
			this.listeners.delete(listener);

			if (this.listeners.size === 0) {
				this.channel?.close();
				this.channel = null;
			}
		};
	}

	/** Sign in from now on as an app the user registered with the authorization server. */
	useClient(server: McpOAuthServer, client: { clientId: string; clientSecret?: string }): void {
		const clientSecret = client.clientSecret?.trim();

		mcpOAuthStorage.update(server.id, server.url, mcpOAuthRedirectUrl(), (record) => ({
			...record,
			clientInformation: {
				client_id: client.clientId.trim(),
				...(clientSecret ? { client_secret: clientSecret } : {})
			}
		}));
		this.manualClientRequired.delete(server.id);
		this.errors.delete(server.id);
	}

	private async exchangeCode(
		serverId: string,
		serverUrl: string,
		params: URLSearchParams,
		useProxy: boolean,
		interactive: { mode: McpOAuthFlowMode; returnUrl: string }
	): Promise<McpOAuthResult> {
		const code = params.get('code');

		if (!code) return { error: 'The authorization server sent no code back', ok: false, serverId };

		const provider = new McpOAuthProvider({
			interactive: { ...interactive, navigate: () => {} },
			serverId,
			serverUrl,
			useProxy
		});

		try {
			const { auth } = await MCPService.loadSdk();

			await auth(provider, {
				authorizationCode: code,
				fetchFn: mcpOAuthFetch(useProxy),
				iss: params.get('iss') ?? undefined,
				serverUrl
			});

			return { ok: true, serverId };
		} catch (error) {
			return { error: errorMessage(error), ok: false, serverId };
		}
	}

	private openChannel(): void {
		if (this.channel || typeof BroadcastChannel === 'undefined') return;

		this.channel = new BroadcastChannel(CHANNEL_NAME);
		this.channel.onmessage = (event: MessageEvent<McpOAuthResult>) => {
			// another tab wrote the tokens: read them again
			mcpOAuthStorage.invalidate();
			this.settle(event.data);
		};
	}

	private publish(result: McpOAuthResult): void {
		this.settle(result);

		// a channel of its own: the one listening here does not hear its own messages
		if (typeof BroadcastChannel === 'undefined') return;

		const channel = new BroadcastChannel(CHANNEL_NAME);

		channel.postMessage(result);
		channel.close();
	}

	private async revoke(
		endpoint: string,
		token: string,
		tokenTypeHint: string,
		client: { client_id: string; client_secret?: string },
		fetchFn: FetchLike
	): Promise<void> {
		const fields: Record<string, string> = {
			client_id: client.client_id,
			token,
			token_type_hint: tokenTypeHint
		};

		if (client.client_secret) fields.client_secret = client.client_secret;

		const body = new URLSearchParams(fields).toString();

		try {
			await fetchFn(endpoint, {
				body,
				headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
				method: 'POST'
			});
		} catch (error) {
			// the tokens are forgotten here either way
			console.warn('[MCP OAuth] Could not revoke the token:', error);
		}
	}

	private settle(result: McpOAuthResult): void {
		this.signingIn.delete(result.serverId);

		if (result.ok) {
			this.errors.delete(result.serverId);
			this.signInRequired.delete(result.serverId);
		} else if (result.error) {
			this.errors.set(result.serverId, result.error);
		}

		for (const listener of this.listeners) listener(result);
	}
}

export const mcpOAuthFlow = new McpOAuthFlow();
