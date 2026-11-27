// Signing in to an MCP server with the browser, end to end against an
// in-process server behind OAuth: a background connection stops at the sign-in
// without registering anything, the sign-in registers a client and sends the
// browser to the authorization page, the callback exchanges the code, and the
// server then connects with the token; expired tokens refresh on their own,
// a refused refresh asks for a sign-in again, and sign-out revokes.

import { createOAuthMcpServer, ISSUER, MCP_URL } from './fixtures/oauth-mcp-server';
import { CORS_PROXY, CORS_PROXY_ENDPOINT } from '#lib/constants/index.ts';
import { MCPConnectionPhase, MCPTransportType } from '#lib/enums/index.ts';
import { mcpOAuthFlow } from '#lib/extensions/mcp/oauth/flow.svelte.ts';
import {
	McpCredentialsRequiredError,
	mcpOAuthRedirectUrl,
	McpSignInRequiredError
} from '#lib/extensions/mcp/oauth/provider.ts';
import {
	MCP_OAUTH_LOCALSTORAGE_KEY,
	mcpOAuthStorage
} from '#lib/extensions/mcp/oauth/storage.svelte.ts';
import { MCPService } from '#lib/extensions/mcp/services/mcp.service.ts';
import type { MCPConnectionLog, MCPServerConfig } from '#lib/types/index.ts';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const APP = 'http://localhost:8080';
const SERVER_ID = 'srv-oauth';
const CONFIG: MCPServerConfig = { transport: MCPTransportType.STREAMABLE_HTTP, url: MCP_URL };

type Fixture = ReturnType<typeof createOAuthMcpServer>;

function stubBrowser(fixture: Fixture, options: { proxy?: boolean } = {}) {
	const data = new Map<string, string>();
	const location = new URL(`${APP}/#/chat/abc`);
	const history = {
		replaceState: (_state: unknown, _title: string, url: string) => {
			location.href = new URL(url, location.href).href;
		},
		state: null
	};

	vi.stubGlobal('localStorage', {
		getItem: (key: string) => data.get(key) ?? null,
		removeItem: (key: string) => void data.delete(key),
		setItem: (key: string, value: string) => void data.set(key, value)
	});
	vi.stubGlobal('window', {
		history,
		location: {
			...locationProxy(location),
			assign: vi.fn(),
			replace: (url: string) => {
				location.href = new URL(url, location.href).href;
			}
		}
	});
	vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
		let request = new Request(input, init);

		// what llama-server's /cors-proxy does: unwrap the target and its headers
		if (request.url.startsWith(`${APP}${CORS_PROXY_ENDPOINT}`)) {
			if (!options.proxy) throw new Error('the proxy was used without being asked for');

			const target = new URL(request.url).searchParams.get(CORS_PROXY.URL_PARAM)!;
			const headers = new Headers();

			for (const [key, value] of request.headers) {
				if (key.startsWith(CORS_PROXY.HEADER_PREFIX)) {
					headers.set(key.slice(CORS_PROXY.HEADER_PREFIX.length), value);
				}
			}

			request = new Request(target, {
				body: request.method === 'POST' ? await request.text() : undefined,
				headers,
				method: request.method
			});
		} else if (options.proxy) {
			throw new Error(`${request.url} was fetched around the proxy`);
		}

		return fixture.handle(request);
	});

	return { data, location };
}

// window.location keeps `href` live: the flow reads it and rewrites it through history
function locationProxy(location: URL) {
	return {
		get href() {
			return location.href;
		},
		get origin() {
			return location.origin;
		},
		get search() {
			return location.search;
		}
	};
}

function connect(fixture: Fixture, config: MCPServerConfig = CONFIG) {
	const logs: MCPConnectionLog[] = [];
	const connection = MCPService.connect(SERVER_ID, config, undefined, undefined, (_phase, log) => {
		logs.push(log);
	});

	return { connection, logs };
}

/** Run a sign-in: returns the authorization page it sent the popup to. */
async function startSignIn(config: MCPServerConfig = CONFIG): Promise<URL> {
	const popup = { close: vi.fn(), location: { href: '' } } as unknown as Window;

	await mcpOAuthFlow.signIn({ id: SERVER_ID, url: config.url, useProxy: config.useProxy }, popup);

	expect(popup.location.href).not.toBe('');

	return new URL(popup.location.href);
}

async function signIn(fixture: Fixture, config: MCPServerConfig = CONFIG) {
	const authorizationUrl = await startSignIn(config);

	return mcpOAuthFlow.completeFromLocation(fixture.authorize(authorizationUrl));
}

describe('MCP OAuth sign-in', () => {
	let fixture: Fixture;

	beforeEach(() => {
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
		fixture = createOAuthMcpServer();
		mcpOAuthFlow.clearSignInRequired(SERVER_ID);
	});

	it('stops a background connection at the sign-in, without registering a client', async () => {
		stubBrowser(fixture);

		const { connection, logs } = connect(fixture);

		await expect(connection).rejects.toBeInstanceOf(McpSignInRequiredError);
		expect(mcpOAuthFlow.needsSignIn(SERVER_ID)).toBe(true);
		expect(fixture.requests.some((r) => r.url === `${ISSUER}/register`)).toBe(false);
		expect(logs.map((log) => log.message)).toEqual(
			expect.arrayContaining([
				`OAuth: Authorization server: ${ISSUER}`,
				'OAuth: The server needs you to sign in',
				'Sign in to use this server'
			])
		);
		expect(logs.at(-1)?.phase).toBe(MCPConnectionPhase.ERROR);
	});

	it('registers, sends the popup to the authorization page with PKCE, and signs in on the callback', async () => {
		const { location } = stubBrowser(fixture);
		const results: unknown[] = [];
		const unsubscribe = mcpOAuthFlow.subscribe((result) => results.push(result));

		mcpOAuthFlow.markSignInRequired(SERVER_ID);

		const authorizationUrl = await startSignIn();

		expect(mcpOAuthFlow.isSigningIn(SERVER_ID)).toBe(true);
		expect(authorizationUrl.origin + authorizationUrl.pathname).toBe(`${ISSUER}/authorize`);
		expect(authorizationUrl.searchParams.get('client_id')).toBe('client-1');
		expect(authorizationUrl.searchParams.get('redirect_uri')).toBe(`${APP}/?mcp_oauth=1`);
		expect(authorizationUrl.searchParams.get('code_challenge_method')).toBe('S256');
		expect(authorizationUrl.searchParams.get('resource')).toBe(MCP_URL);
		expect(authorizationUrl.searchParams.get('state')).toMatch(/^[0-9a-f]{64}$/);

		// the popup comes back to the app, which finishes the sign-in there
		const outcome = await mcpOAuthFlow.completeFromLocation(fixture.authorize(authorizationUrl));

		expect(outcome).toEqual({ closeWindow: true, result: { ok: true, serverId: SERVER_ID } });
		expect(results).toEqual([{ ok: true, serverId: SERVER_ID }]);
		expect(mcpOAuthFlow.isSigningIn(SERVER_ID)).toBe(false);
		expect(mcpOAuthFlow.needsSignIn(SERVER_ID)).toBe(false);
		expect(mcpOAuthFlow.isSignedIn({ id: SERVER_ID, url: MCP_URL })).toBe(true);
		// the code and state leave the address bar at once
		expect(location.search).toBe('');

		const { connection } = connect(fixture);
		const connected = await connection;

		expect(connected.tools.map((tool) => tool.name)).toEqual(['whoami']);
		expect(fixture.requests.filter((r) => r.url === MCP_URL).at(-1)?.authorization).toMatch(
			/^Bearer /
		);
		unsubscribe();
	});

	it('refreshes an expired token on its own', async () => {
		stubBrowser(fixture);
		await signIn(fixture);
		fixture.expireAccessTokens();

		const { connection, logs } = connect(fixture);

		await expect(connection).resolves.toMatchObject({ serverName: SERVER_ID });
		expect(logs.map((log) => log.message)).toContain('OAuth: Access token refreshed');
		expect(fixture.requests.filter((r) => r.url === `${ISSUER}/register`)).toHaveLength(1);
	});

	it('asks for a sign-in again once the refresh token is refused', async () => {
		stubBrowser(fixture);
		await signIn(fixture);
		fixture.expireAccessTokens();
		fixture.control.rejectRefresh = true;

		const { connection } = connect(fixture);

		await expect(connection).rejects.toBeInstanceOf(McpSignInRequiredError);
		expect(mcpOAuthFlow.needsSignIn(SERVER_ID)).toBe(true);
	});

	it('reports a refused sign-in without the description the address bar carried', async () => {
		stubBrowser(fixture);

		const authorizationUrl = await startSignIn();
		const outcome = await mcpOAuthFlow.completeFromLocation(
			fixture.authorize(authorizationUrl, { deny: true })
		);

		expect(outcome?.result).toEqual({
			error: 'The sign-in was cancelled or refused',
			ok: false,
			serverId: SERVER_ID
		});
		expect(mcpOAuthFlow.errorFor(SERVER_ID)).toBe('The sign-in was cancelled or refused');
		expect(mcpOAuthFlow.isSignedIn({ id: SERVER_ID, url: MCP_URL })).toBe(false);
	});

	it('ignores a callback whose state no sign-in of this browser is waiting for', async () => {
		stubBrowser(fixture);

		const authorizationUrl = await startSignIn();
		const forged = fixture.authorize(authorizationUrl);

		forged.searchParams.set('state', 'not-the-state');

		await expect(mcpOAuthFlow.completeFromLocation(forged)).resolves.toEqual({
			closeWindow: false,
			result: null
		});
		expect(fixture.requests.some((r) => r.url === `${ISSUER}/token`)).toBe(false);
	});

	it('leaves other page loads alone', async () => {
		stubBrowser(fixture);

		await expect(
			mcpOAuthFlow.completeFromLocation(new URL(`${APP}/?code=x&state=y`))
		).resolves.toBeNull();
	});

	it('goes back to where a sign-in in this tab started', async () => {
		const { location } = stubBrowser(fixture);

		await mcpOAuthFlow.signIn({ id: SERVER_ID, url: MCP_URL }, null);

		const assign = vi.mocked(window.location.assign);
		const authorizationUrl = new URL(assign.mock.calls[0][0] as string);
		const outcome = await mcpOAuthFlow.completeFromLocation(fixture.authorize(authorizationUrl));

		expect(outcome).toEqual({ closeWindow: false, result: { ok: true, serverId: SERVER_ID } });
		expect(location.href).toBe(`${APP}/#/chat/abc`);
	});

	it('signs out by revoking the token and forgetting it, keeping the registration', async () => {
		const { data } = stubBrowser(fixture);

		await signIn(fixture);
		await mcpOAuthFlow.signOut({ id: SERVER_ID, url: MCP_URL });

		expect(fixture.revoked).toHaveLength(1);
		expect(fixture.requests.find((r) => r.url === `${ISSUER}/revoke`)?.body).toContain(
			'client_id=client-1'
		);
		expect(mcpOAuthFlow.isSignedIn({ id: SERVER_ID, url: MCP_URL })).toBe(false);

		const record = JSON.parse(data.get(MCP_OAUTH_LOCALSTORAGE_KEY)!)[SERVER_ID];

		expect(record.clientInformation.client_id).toBe('client-1');
		expect(record.tokens).toBeUndefined();
	});

	it('keeps tokens of one server URL away from another', async () => {
		stubBrowser(fixture);
		await signIn(fixture);

		expect(
			mcpOAuthStorage.get(SERVER_ID, 'https://other.example.com/mcp', mcpOAuthRedirectUrl())
		).toBeUndefined();
	});

	it('leaves a server with an Authorization header of its own to that header', async () => {
		stubBrowser(fixture);

		const { connection } = connect(fixture, {
			...CONFIG,
			headers: { Authorization: 'Bearer pasted-token' }
		});

		await expect(connection).rejects.not.toBeInstanceOf(McpSignInRequiredError);
		expect(fixture.requests.some((r) => r.url.includes('/.well-known/'))).toBe(false);
		expect(mcpOAuthFlow.needsSignIn(SERVER_ID)).toBe(false);
	});

	it('says to add a token when the server answers 401 with no sign-in on offer', async () => {
		const plain = {
			...fixture,
			handle: async (request: Request) => {
				fixture.requests.push({
					authorization: null,
					body: '',
					method: request.method,
					url: request.url
				});

				return new Response('{}', { status: request.url === MCP_URL ? 401 : 404 });
			}
		};

		stubBrowser(plain as Fixture);

		await expect(connect(fixture).connection).rejects.toBeInstanceOf(McpCredentialsRequiredError);
		expect(fixture.requests.some((r) => r.url.endsWith('/register'))).toBe(false);
	});

	it('asks for the client ID of an app registered by hand where the server registers none', async () => {
		stubBrowser(fixture);
		fixture.control.noRegistration = true;

		const popup = { close: vi.fn(), location: { href: '' } } as unknown as Window;

		await mcpOAuthFlow.signIn({ id: SERVER_ID, url: MCP_URL }, popup);

		expect(mcpOAuthFlow.needsClientId(SERVER_ID)).toBe(true);
		expect(mcpOAuthFlow.errorFor(SERVER_ID)).toMatch(/client ID of an app you registered/);
		expect(popup.close).toHaveBeenCalled();

		fixture.registerByHand('my-own-app', `${APP}/?mcp_oauth=1`);
		mcpOAuthFlow.useClient(
			{ id: SERVER_ID, url: MCP_URL },
			{ clientId: ' my-own-app ', clientSecret: 'shh' }
		);

		expect(mcpOAuthFlow.needsClientId(SERVER_ID)).toBe(false);

		const authorizationUrl = await startSignIn();

		expect(authorizationUrl.searchParams.get('client_id')).toBe('my-own-app');

		await mcpOAuthFlow.completeFromLocation(fixture.authorize(authorizationUrl));

		expect(mcpOAuthFlow.isSignedIn({ id: SERVER_ID, url: MCP_URL })).toBe(true);
		// the secret goes to the token endpoint, the one place it belongs
		expect(fixture.requests.find((r) => r.url === `${ISSUER}/token`)?.body).toContain(
			'client_secret=shh'
		);
	});

	it('runs the whole sign-in through the CORS proxy, keeping the real resource', async () => {
		stubBrowser(fixture, { proxy: true });

		const config = { ...CONFIG, useProxy: true };
		const authorizationUrl = await startSignIn(config);

		expect(authorizationUrl.searchParams.get('resource')).toBe(MCP_URL);

		await mcpOAuthFlow.completeFromLocation(fixture.authorize(authorizationUrl));

		await expect(connect(fixture, config).connection).resolves.toMatchObject({
			serverName: SERVER_ID
		});
		expect(fixture.requests.map((r) => new URL(r.url).pathname)).toEqual(
			expect.arrayContaining(['/register', '/token', '/mcp'])
		);
	});
});
