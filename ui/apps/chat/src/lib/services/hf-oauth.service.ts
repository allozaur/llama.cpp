/**
 * HfOAuthService - Stateless calls for signing in with a Hugging Face account
 *
 * OAuth 2.1 for a public client in the browser: the app registers itself
 * (dynamic client registration) for the redirect URL of the origin it is
 * served from, then runs the authorization code flow with PKCE. The token
 * and registration endpoints answer cross-origin requests, so no server is
 * involved.
 * Reference: https://huggingface.co/docs/hub/oauth
 */

import {
	HF_OAUTH_AUTHORIZE_URL,
	HF_OAUTH_CALLBACK_PARAM,
	HF_OAUTH_CLIENT_NAME,
	HF_OAUTH_REGISTER_URL,
	HF_OAUTH_REQUIRED_SCOPE,
	HF_OAUTH_SCOPES,
	HF_OAUTH_TOKEN_URL
} from '#lib/constants/index.ts';
import type { HfOAuthTokens } from '#lib/types/index.ts';
import { withBase } from '#lib/utils/base-path.ts';

const RANDOM_BYTES = 32;

function base64Url(bytes: Uint8Array): string {
	return btoa(String.fromCharCode(...bytes))
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=+$/, '');
}

function randomString(): string {
	return base64Url(crypto.getRandomValues(new Uint8Array(RANDOM_BYTES)));
}

/** The OAuth error of a failed response, as one readable line. */
async function oauthError(response: Response): Promise<string> {
	try {
		const body = await response.json();
		const code = typeof body?.error === 'string' ? body.error : '';
		const description = typeof body?.error_description === 'string' ? body.error_description : '';

		if (code || description) return [code, description].filter(Boolean).join(': ');
	} catch {
		// not JSON; keep the status
	}

	return `HTTP ${response.status}`;
}

async function readTokens(response: Response, now: number): Promise<HfOAuthTokens> {
	const body = await response.json();

	if (typeof body?.access_token !== 'string') {
		throw new Error('Hugging Face sent no access token back.');
	}

	return {
		accessToken: body.access_token,
		expiresAt: typeof body.expires_in === 'number' ? now + body.expires_in * 1000 : undefined,
		refreshToken: typeof body.refresh_token === 'string' ? body.refresh_token : undefined,
		scope: typeof body.scope === 'string' ? body.scope : undefined
	};
}

export class HfOAuthService {
	/** The Hugging Face page that asks the user to let the app in. */
	static authorizationUrl(params: {
		clientId: string;
		codeChallenge: string;
		redirectUrl: string;
		state: string;
	}): URL {
		const url = new URL(HF_OAUTH_AUTHORIZE_URL);

		url.searchParams.set('client_id', params.clientId);
		url.searchParams.set('code_challenge', params.codeChallenge);
		url.searchParams.set('code_challenge_method', 'S256');
		url.searchParams.set('redirect_uri', params.redirectUrl);
		url.searchParams.set('response_type', 'code');
		url.searchParams.set('scope', HF_OAUTH_SCOPES.join(' '));
		url.searchParams.set('state', params.state);

		return url;
	}

	/** Whether tokens carry the scope a share needs; tokens that do not say are let through. */
	static canWrite(tokens: HfOAuthTokens): boolean {
		return !tokens.scope || tokens.scope.split(/\s+/).includes(HF_OAUTH_REQUIRED_SCOPE);
	}

	/** A PKCE verifier and its S256 challenge. */
	static async createPkce(
		verifier: string = randomString()
	): Promise<{ challenge: string; verifier: string }> {
		const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));

		return { challenge: base64Url(new Uint8Array(digest)), verifier };
	}

	/** A random `state`, so a callback can only finish the sign-in that asked for it. */
	static createState(): string {
		return randomString();
	}

	/**
	 * Trades the code the authorization page sent back for tokens.
	 * @throws When Hugging Face refuses the code
	 */
	static async exchangeCode(params: {
		clientId: string;
		code: string;
		codeVerifier: string;
		redirectUrl: string;
	}): Promise<HfOAuthTokens> {
		return HfOAuthService.requestTokens(
			{
				client_id: params.clientId,
				code: params.code,
				code_verifier: params.codeVerifier,
				grant_type: 'authorization_code',
				redirect_uri: params.redirectUrl
			},
			'The sign-in'
		);
	}

	/** The page Hugging Face sends the browser back to: the app's root, with a marker. */
	static redirectUrl(): string {
		const url = new URL(withBase('/'), window.location.origin);

		url.searchParams.set(HF_OAUTH_CALLBACK_PARAM, '1');

		return url.href;
	}

	/**
	 * Gets a new access token with a refresh token.
	 * @throws When the refresh token is no longer good
	 */
	static async refresh(clientId: string, refreshToken: string): Promise<HfOAuthTokens> {
		const tokens = await HfOAuthService.requestTokens(
			{ client_id: clientId, grant_type: 'refresh_token', refresh_token: refreshToken },
			'Renewing the sign-in'
		);

		// a refresh may not hand out a new refresh token: the old one stays good
		return { ...tokens, refreshToken: tokens.refreshToken ?? refreshToken };
	}

	/**
	 * Registers the app as a public client for one redirect URL.
	 * @returns The client ID
	 * @throws When Hugging Face turns the registration down
	 */
	static async register(redirectUrl: string): Promise<string> {
		let response: Response;

		try {
			response = await fetch(HF_OAUTH_REGISTER_URL, {
				body: JSON.stringify({
					client_name: HF_OAUTH_CLIENT_NAME,
					grant_types: ['authorization_code', 'refresh_token'],
					redirect_uris: [redirectUrl],
					response_types: ['code'],
					scope: HF_OAUTH_SCOPES.join(' '),
					// a public client: the browser holds no secret worth the name
					token_endpoint_auth_method: 'none'
				}),
				headers: { 'Content-Type': 'application/json' },
				method: 'POST'
			});
		} catch {
			throw new Error('Could not reach Hugging Face to start the sign-in.');
		}

		if (!response.ok) {
			throw new Error(
				`Hugging Face does not allow signing in from ${new URL(redirectUrl).origin} (${await oauthError(response)}).`
			);
		}

		const body = await response.json();

		if (typeof body?.client_id !== 'string') {
			throw new Error('Hugging Face registered the app but sent no client ID back.');
		}

		return body.client_id;
	}

	private static async requestTokens(
		fields: Record<string, string>,
		action: string
	): Promise<HfOAuthTokens> {
		const now = Date.now();

		let response: Response;

		try {
			response = await fetch(HF_OAUTH_TOKEN_URL, {
				body: new URLSearchParams(fields).toString(),
				headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
				method: 'POST'
			});
		} catch {
			throw new Error(`${action} could not reach Hugging Face.`);
		}

		if (!response.ok) {
			throw new Error(`${action} failed: ${await oauthError(response)}.`);
		}

		return readTokens(response, now);
	}
}
