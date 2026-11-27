/**
 * The OAuth client the MCP SDK drives for one server. The SDK runs the
 * protocol (discovery, registration, PKCE, token exchange and refresh); this
 * provider keeps what it needs across the trip to the authorization page and
 * decides what happens when a sign-in is needed.
 *
 * A connection in the background never opens anything: when the server wants
 * a sign-in and there are no tokens to refresh, the provider records that and
 * the connection fails with {@link McpSignInRequiredError}. Only a sign-in the
 * user started navigates to the authorization page.
 */

import { type McpOAuthPendingFlow, mcpOAuthStorage } from './storage.svelte';
import type {
	OAuthClientMetadata,
	OAuthClientProvider,
	OAuthDiscoveryState,
	StoredOAuthClientInformation,
	StoredOAuthTokens
} from '@modelcontextprotocol/client';
import { DEFAULT_CLIENT_VERSION } from '#lib/constants/index.ts';
import { withBase } from '#lib/utils/base-path.ts';

/** Query parameter that marks a page load as an MCP sign-in coming back. */
export const MCP_OAUTH_CALLBACK_PARAM = 'mcp_oauth';

/** The name the app registers under, shown on the authorization page. */
export const MCP_OAUTH_CLIENT_NAME = 'Llama Chat';

/** Thrown where a server wants credentials and offers no sign-in: a token has to be set by hand. */
export class McpCredentialsRequiredError extends Error {
	constructor(readonly serverId: string) {
		super(
			"The server needs credentials and offers no sign-in: add a token under Authorization in the server's settings"
		);
		this.name = 'McpCredentialsRequiredError';
	}
}

/** Thrown where a server needs the user to sign in before it can be used. */
export class McpSignInRequiredError extends Error {
	constructor(readonly serverId: string) {
		super('Sign in to use this server');
		this.name = 'McpSignInRequiredError';
	}
}

/** The page the authorization server sends the browser back to: the app's root, with a marker. */
export function mcpOAuthRedirectUrl(): string {
	const url = new URL(withBase('/'), window.location.origin);

	url.searchParams.set(MCP_OAUTH_CALLBACK_PARAM, '1');

	return url.href;
}

/** A random `state`, so a callback can only finish the sign-in that asked for it. */
export function createOAuthState(): string {
	const bytes = new Uint8Array(32);

	crypto.getRandomValues(bytes);

	return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export interface McpOAuthProviderOptions {
	/**
	 * Set for a sign-in the user started: where to send the browser for the
	 * authorization page. Left out, the provider never leaves the page.
	 */
	interactive?: {
		mode: McpOAuthPendingFlow['mode'];
		navigate: (authorizationUrl: URL) => void;
		returnUrl: string;
	};
	/** Steps worth showing in the connection log. */
	onStep?: (message: string) => void;
	serverId: string;
	serverUrl: string;
	useProxy: boolean;
}

export class McpOAuthProvider implements OAuthClientProvider {
	/** Set once the server answered 401 without publishing an authorization server. */
	credentialsRequired = false;
	/** Set once the server asked for a sign-in this provider could not complete on its own. */
	signInRequired = false;

	private readonly redirect: string;

	get clientMetadata(): OAuthClientMetadata {
		return {
			client_name: MCP_OAUTH_CLIENT_NAME,
			grant_types: ['authorization_code', 'refresh_token'],
			redirect_uris: [this.redirect],
			response_types: ['code'],
			software_version: DEFAULT_CLIENT_VERSION,
			// a public client: the browser holds no secret worth the name
			token_endpoint_auth_method: 'none'
		};
	}

	get redirectUrl(): string {
		return this.redirect;
	}

	clientInformation(): StoredOAuthClientInformation | undefined {
		const stored = this.record()?.clientInformation;

		// registering a client is a side effect on the authorization server: only for a sign-in the user started
		if (!stored && !this.options.interactive) {
			// discovery ran just before this: without an authorization server there is nothing to sign in to
			if (!this.record()?.discoveryState?.authorizationServerMetadata) {
				this.credentialsRequired = true;

				throw new McpCredentialsRequiredError(this.options.serverId);
			}

			this.requireSignIn();
		}

		return stored;
	}

	codeVerifier(): string {
		const verifier = this.record()?.pending?.codeVerifier;

		if (!verifier) throw new Error('This sign-in has no PKCE verifier; start it again');

		return verifier;
	}

	constructor(private readonly options: McpOAuthProviderOptions) {
		this.redirect = mcpOAuthRedirectUrl();
	}

	discoveryState(): OAuthDiscoveryState | undefined {
		return this.record()?.discoveryState;
	}

	invalidateCredentials(scope: 'all' | 'client' | 'tokens' | 'verifier' | 'discovery'): void {
		if (scope === 'all') {
			mcpOAuthStorage.remove(this.options.serverId);

			return;
		}

		this.update((record) => {
			const next = { ...record };

			if (scope === 'client') delete next.clientInformation;

			if (scope === 'tokens') delete next.tokens;

			if (scope === 'discovery') delete next.discoveryState;

			if (scope === 'verifier' && next.pending) {
				next.pending = { ...next.pending, codeVerifier: undefined };
			}

			return next;
		});
	}

	redirectToAuthorization(authorizationUrl: URL): void {
		const { interactive } = this.options;

		if (!interactive) {
			this.requireSignIn();

			return;
		}

		this.options.onStep?.(`Opening the sign-in page of ${authorizationUrl.origin}`);
		interactive.navigate(authorizationUrl);
	}

	saveClientInformation(clientInformation: StoredOAuthClientInformation): void {
		this.options.onStep?.(
			`Registered with the authorization server as ${clientInformation.client_id}`
		);
		this.update((record) => ({ ...record, clientInformation }));
	}

	saveCodeVerifier(codeVerifier: string): void {
		this.update((record) =>
			record.pending ? { ...record, pending: { ...record.pending, codeVerifier } } : record
		);
	}

	saveDiscoveryState(discoveryState: OAuthDiscoveryState): void {
		this.options.onStep?.(`Authorization server: ${discoveryState.authorizationServerUrl}`);
		this.update((record) => ({ ...record, discoveryState }));
	}

	saveTokens(tokens: StoredOAuthTokens): void {
		const refreshed = this.record()?.tokens !== undefined;

		this.options.onStep?.(refreshed ? 'Access token refreshed' : 'Signed in');
		this.update((record) => ({ ...record, pending: undefined, tokens }));
	}

	/** A fresh `state` for the sign-in about to start, kept with it until the callback. */
	state(): string {
		const { interactive } = this.options;
		const state = createOAuthState();

		// a connection in the background never leaves for the authorization page: nothing to come back to
		if (!interactive) return state;

		const pending: McpOAuthPendingFlow = {
			mode: interactive.mode,
			returnUrl: interactive.returnUrl,
			startedAt: Date.now(),
			state,
			useProxy: this.options.useProxy
		};

		this.update((record) => ({ ...record, pending }));

		return state;
	}

	tokens(): StoredOAuthTokens | undefined {
		return this.record()?.tokens;
	}

	private record() {
		return mcpOAuthStorage.get(this.options.serverId, this.options.serverUrl, this.redirect);
	}

	private requireSignIn(): never {
		if (!this.signInRequired) this.options.onStep?.('The server needs you to sign in');

		this.signInRequired = true;

		throw new McpSignInRequiredError(this.options.serverId);
	}

	private update(change: Parameters<typeof mcpOAuthStorage.update>[3]): void {
		mcpOAuthStorage.update(this.options.serverId, this.options.serverUrl, this.redirect, change);
	}
}
