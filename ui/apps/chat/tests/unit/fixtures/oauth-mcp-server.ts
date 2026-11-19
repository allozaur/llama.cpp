// A small MCP server behind OAuth, in process: protected resource metadata,
// authorization server metadata, dynamic client registration, an authorize
// step that approves at once, a token endpoint that checks PKCE and issues
// refreshable tokens, and token revocation. Enough for the browser client's
// whole sign-in to run against it.

import { createMcpHandler, McpServer } from '@modelcontextprotocol/server';
import { createHash, randomBytes } from 'node:crypto';

export const ISSUER = 'https://auth.example.com';
export const MCP_URL = 'https://mcp.example.com/mcp';

interface Grant {
	clientId: string;
	codeChallenge: string;
	redirectUri: string;
	resource: string | null;
}

export interface OAuthFixtureRequest {
	authorization: string | null;
	body: string;
	method: string;
	url: string;
}

function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
	return new Response(JSON.stringify(body), {
		headers: { 'Content-Type': 'application/json', ...headers },
		status
	});
}

function base64Url(buffer: Buffer): string {
	return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function createOAuthMcpServer() {
	const clients = new Map<string, { redirectUris: string[] }>();
	const codes = new Map<string, Grant>();
	const accessTokens = new Set<string>();
	const refreshTokens = new Map<string, string>();
	const requests: OAuthFixtureRequest[] = [];
	const revoked: string[] = [];
	const mcp = createMcpHandler(() => {
		const server = new McpServer({ name: 'oauth-test-server', version: '1.0.0' });

		server.registerTool('whoami', { description: 'Who the token belongs to' }, async () => ({
			content: [{ text: 'signed-in user', type: 'text' }]
		}));

		return server;
	});
	const control = { noRegistration: false, rejectRefresh: false };

	function issueTokens(clientId: string) {
		const accessToken = base64Url(randomBytes(16));
		const refreshToken = base64Url(randomBytes(16));

		accessTokens.add(accessToken);
		refreshTokens.set(refreshToken, clientId);

		return {
			access_token: accessToken,
			expires_in: 3600,
			refresh_token: refreshToken,
			scope: 'mcp',
			token_type: 'Bearer'
		};
	}

	async function handle(request: Request): Promise<Response> {
		const url = new URL(request.url);
		const body = request.method === 'POST' ? await request.clone().text() : '';

		requests.push({
			authorization: request.headers.get('authorization'),
			body,
			method: request.method,
			url: request.url
		});

		if (url.href === MCP_URL) {
			const token = request.headers.get('authorization')?.replace(/^Bearer /, '');

			if (!token || !accessTokens.has(token)) {
				return json({ error: 'invalid_token' }, 401, {
					'WWW-Authenticate': `Bearer resource_metadata="https://mcp.example.com/.well-known/oauth-protected-resource/mcp", scope="mcp"`
				});
			}

			return mcp.fetch(request);
		}

		if (url.href === 'https://mcp.example.com/.well-known/oauth-protected-resource/mcp') {
			return json({
				authorization_servers: [ISSUER],
				resource: MCP_URL,
				scopes_supported: ['mcp']
			});
		}

		if (url.href === `${ISSUER}/.well-known/oauth-authorization-server`) {
			return json({
				authorization_endpoint: `${ISSUER}/authorize`,
				code_challenge_methods_supported: ['S256'],
				grant_types_supported: ['authorization_code', 'refresh_token'],
				issuer: ISSUER,
				...(control.noRegistration ? {} : { registration_endpoint: `${ISSUER}/register` }),
				response_types_supported: ['code'],
				revocation_endpoint: `${ISSUER}/revoke`,
				scopes_supported: ['mcp'],
				token_endpoint: `${ISSUER}/token`,
				token_endpoint_auth_methods_supported: ['none', 'client_secret_post']
			});
		}

		if (url.href === `${ISSUER}/register` && request.method === 'POST') {
			const metadata = JSON.parse(body) as { redirect_uris: string[] };
			const clientId = `client-${clients.size + 1}`;

			clients.set(clientId, { redirectUris: metadata.redirect_uris });

			return json({ ...metadata, client_id: clientId, client_id_issued_at: 0 }, 201);
		}

		if (url.href === `${ISSUER}/token` && request.method === 'POST') {
			const form = new URLSearchParams(body);

			if (form.get('grant_type') === 'authorization_code') {
				const grant = codes.get(form.get('code') ?? '');
				const verifier = form.get('code_verifier') ?? '';

				codes.delete(form.get('code') ?? '');

				if (
					!grant ||
					grant.clientId !== form.get('client_id') ||
					grant.redirectUri !== form.get('redirect_uri') ||
					base64Url(createHash('sha256').update(verifier).digest()) !== grant.codeChallenge
				) {
					return json({ error: 'invalid_grant' }, 400);
				}

				return json(issueTokens(grant.clientId));
			}

			if (form.get('grant_type') === 'refresh_token') {
				const clientId = refreshTokens.get(form.get('refresh_token') ?? '');

				if (!clientId || control.rejectRefresh) return json({ error: 'invalid_grant' }, 400);

				refreshTokens.delete(form.get('refresh_token') ?? '');

				return json(issueTokens(clientId));
			}

			return json({ error: 'unsupported_grant_type' }, 400);
		}

		if (url.href === `${ISSUER}/revoke` && request.method === 'POST') {
			const token = new URLSearchParams(body).get('token') ?? '';

			revoked.push(token);
			refreshTokens.delete(token);
			accessTokens.delete(token);

			return new Response(null, { status: 200 });
		}

		return new Response('not found', { status: 404 });
	}

	/** An app the user registered with the authorization server by hand. */
	function registerByHand(clientId: string, redirectUri: string): void {
		clients.set(clientId, { redirectUris: [redirectUri] });
	}

	/**
	 * The user approving on the authorization page: the URL the browser is sent
	 * back to, with a code for this request, or with an error when denied.
	 */
	function authorize(authorizationUrl: URL, options: { deny?: boolean } = {}): URL {
		const clientId = authorizationUrl.searchParams.get('client_id') ?? '';
		const redirectUri = authorizationUrl.searchParams.get('redirect_uri') ?? '';
		const callback = new URL(redirectUri);
		const state = authorizationUrl.searchParams.get('state');

		if (!clients.get(clientId)?.redirectUris.includes(redirectUri)) {
			throw new Error(`redirect_uri ${redirectUri} was not registered for ${clientId}`);
		}

		if (state) callback.searchParams.set('state', state);

		if (options.deny) {
			callback.searchParams.set('error', 'access_denied');
			callback.searchParams.set('error_description', 'The user said no');

			return callback;
		}

		const code = base64Url(randomBytes(16));

		codes.set(code, {
			clientId,
			codeChallenge: authorizationUrl.searchParams.get('code_challenge') ?? '',
			redirectUri,
			resource: authorizationUrl.searchParams.get('resource')
		});
		callback.searchParams.set('code', code);

		return callback;
	}

	/** Make every access token handed out so far stop working, as if they expired. */
	function expireAccessTokens(): void {
		accessTokens.clear();
	}

	return {
		authorize,
		codes,
		control,
		expireAccessTokens,
		handle,
		registerByHand,
		requests,
		revoked
	};
}
