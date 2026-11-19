import { HF_OAUTH_LOCALSTORAGE_KEY, HF_TOKEN_LOCALSTORAGE_KEY } from '#lib/constants/index.ts';
import { HfAuthMethod } from '#lib/enums/index.ts';
import { HfOAuthService } from '#lib/services/hf-oauth.service.ts';
import { huggingFaceStore } from '#lib/stores/huggingface.svelte.ts';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const FULL_SCOPE = 'openid profile write-repos manage-repos';

interface HubMock {
	register?: () => Response;
	token?: () => Response;
}

let requests: { body?: string; url: string }[];

function json(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), { status });
}

function mockHub({ register, token }: HubMock = {}) {
	vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
		const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;

		requests.push({ body: init?.body as string | undefined, url });

		if (url.endsWith('/oauth/register')) {
			return register ? register() : json({ client_id: 'client-1' }, 201);
		}

		if (url.endsWith('/oauth/token')) {
			return token
				? token()
				: json({
						access_token: 'hf_oauth_a',
						expires_in: 3600,
						refresh_token: 'r1',
						scope: FULL_SCOPE
					});
		}

		if (url.endsWith('/api/whoami-v2')) return json({ auth: { type: 'oauth' }, name: 'me' });

		throw new Error(`unexpected request: ${url}`);
	});
}

function fakePopup() {
	return { close: vi.fn(), location: { href: '' } };
}

/** Starts a sign-in in a popup and returns the address Hugging Face would send it back to. */
async function startSignIn(popup = fakePopup()): Promise<URL> {
	await huggingFaceStore.signInWithHuggingFace(popup as unknown as Window);

	const authorization = new URL(popup.location.href);
	const callback = new URL(HfOAuthService.redirectUrl());

	callback.searchParams.set('code', 'code-1');
	callback.searchParams.set('state', authorization.searchParams.get('state') ?? '');

	return callback;
}

beforeEach(() => {
	requests = [];
	localStorage.removeItem(HF_OAUTH_LOCALSTORAGE_KEY);
	localStorage.removeItem(HF_TOKEN_LOCALSTORAGE_KEY);
	huggingFaceStore.signOut();
	huggingFaceStore.oauthError = null;
	// the callback clears its parameters from the address; leave the test page's own alone
	vi.spyOn(window.history, 'replaceState').mockImplementation(() => {});
});

afterEach(() => {
	huggingFaceStore.cancelSignInWithHf();
	vi.restoreAllMocks();
});

describe('Sign in with Hugging Face', () => {
	it('signs in through a popup and checks who signed in', async () => {
		mockHub();

		const popup = fakePopup();
		const callback = await startSignIn(popup);
		const authorization = new URL(popup.location.href);

		expect(authorization.origin + authorization.pathname).toBe(
			'https://huggingface.co/oauth/authorize'
		);
		expect(authorization.searchParams.get('redirect_uri')).toBe(HfOAuthService.redirectUrl());
		expect(authorization.searchParams.get('code_challenge_method')).toBe('S256');
		expect(huggingFaceStore.isSigningInWithHf).toBe(true);

		const outcome = await huggingFaceStore.completeSignInFromLocation(callback);

		expect(outcome).toEqual({ closeWindow: true, result: { ok: true } });
		await vi.waitFor(() => expect(huggingFaceStore.user?.name).toBe('me'));
		expect(huggingFaceStore.authMethod).toBe(HfAuthMethod.OAUTH);
		expect(huggingFaceStore.isSigningInWithHf).toBe(false);

		const exchange = new URLSearchParams(
			requests.find((r) => r.url.endsWith('/oauth/token'))?.body
		);

		expect(exchange.get('code')).toBe('code-1');
		expect(exchange.get('code_verifier')).toMatch(/^[\w-]{43}$/);
	});

	it('reuses the registered client on the next sign-in', async () => {
		mockHub();
		await huggingFaceStore.completeSignInFromLocation(await startSignIn());
		huggingFaceStore.signOut();
		await startSignIn();

		expect(requests.filter((r) => r.url.endsWith('/oauth/register'))).toHaveLength(1);
	});

	it('ignores a callback it did not start', async () => {
		mockHub();

		const callback = await startSignIn();

		callback.searchParams.set('state', 'forged');

		const outcome = await huggingFaceStore.completeSignInFromLocation(callback);

		expect(outcome).toEqual({ closeWindow: false, result: null });
		expect(requests.some((r) => r.url.endsWith('/oauth/token'))).toBe(false);
	});

	it('points back to token sign-in when Hugging Face will not register the app', async () => {
		mockHub({ register: () => json({ error: 'invalid_redirect_uri' }, 400) });

		const popup = fakePopup();

		await huggingFaceStore.signInWithHuggingFace(popup as unknown as Window);

		expect(popup.close).toHaveBeenCalled();
		expect(huggingFaceStore.isSigningInWithHf).toBe(false);
		expect(huggingFaceStore.oauthError).toContain('does not allow signing in from');
		expect(huggingFaceStore.oauthError).toContain('Sign in with an access token instead.');
	});

	it('refuses tokens that cannot commit to repositories', async () => {
		mockHub({ token: () => json({ access_token: 'hf_oauth_a', scope: 'openid profile' }) });

		const outcome = await huggingFaceStore.completeSignInFromLocation(await startSignIn());

		expect(outcome?.result?.ok).toBe(false);
		expect(huggingFaceStore.oauthError).toContain('write access');
		expect(huggingFaceStore.hasToken).toBe(false);
	});

	it('says when the user turned the sign-in down', async () => {
		mockHub();

		const callback = await startSignIn();

		callback.searchParams.delete('code');
		callback.searchParams.set('error', 'access_denied');

		const outcome = await huggingFaceStore.completeSignInFromLocation(callback);

		expect(outcome?.result).toEqual({ error: 'The sign-in was cancelled.', ok: false });
	});

	it('renews an expired sign-in with its refresh token', async () => {
		mockHub({
			token: () =>
				json({ access_token: 'hf_oauth_a', expires_in: 0, refresh_token: 'r1', scope: FULL_SCOPE })
		});
		await huggingFaceStore.completeSignInFromLocation(await startSignIn());
		await vi.waitFor(() => expect(huggingFaceStore.user?.name).toBe('me'));

		huggingFaceStore.user = null;
		requests = [];
		mockHub({ token: () => json({ access_token: 'hf_oauth_b', expires_in: 3600 }) });
		await huggingFaceStore.restoreSession();

		const refresh = new URLSearchParams(requests.find((r) => r.url.endsWith('/oauth/token'))?.body);
		const stored = JSON.parse(localStorage.getItem(HF_OAUTH_LOCALSTORAGE_KEY) ?? '{}');

		expect(refresh.get('grant_type')).toBe('refresh_token');
		expect(stored.tokens).toMatchObject({ accessToken: 'hf_oauth_b', refreshToken: 'r1' });
		expect(huggingFaceStore.isSignedIn).toBe(true);
	});

	it('forgets the tokens on sign-out but keeps the registered client', async () => {
		mockHub();
		await huggingFaceStore.completeSignInFromLocation(await startSignIn());
		huggingFaceStore.signOut();

		const stored = JSON.parse(localStorage.getItem(HF_OAUTH_LOCALSTORAGE_KEY) ?? '{}');

		expect(stored.tokens).toBeUndefined();
		expect(stored.clientId).toBe('client-1');
		expect(huggingFaceStore.hasToken).toBe(false);
	});
});
