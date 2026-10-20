// Guards the transport rule the whole remote-server feature leans on: a request
// addressed at a server's tunnel origin is answered by that server's tunnel or
// refused out loud - it never quietly reaches the server serving this UI.

import { CODE_CHARS, CODE_LENGTHS, SETTINGS_KEYS } from '$lib/constants';
import { TunnelStatus } from '$lib/enums';
import { remoteAccessStore, serversStore, settingsStore } from '$lib/stores';
import { tunnelOrigin } from '$lib/utils/server';
import { afterEach, expect, it } from 'vitest';

/** A code of the right length, drawn from the alphabet llama-server generates from. */
const CODE = Array.from(
	{ length: CODE_LENGTHS.SHARE },
	(_, index) => CODE_CHARS[index % CODE_CHARS.length]
).join('');
const originalFetch = window.fetch;

let passthrough: string[] = [];

/**
 * Register one remote server, swap `window.fetch` for a recorder, and install
 * the tunnel transport over it. Returns the recorded requests.
 */
function withTransport(url: string): Promise<Response> {
	settingsStore.updateConfig(
		SETTINGS_KEYS.SERVERS,
		JSON.stringify([{ code: CODE, id: 'r1', kind: 'remote', name: 'Home' }])
	);
	serversStore.initialize();

	passthrough = [];

	window.fetch = ((input: RequestInfo | URL) => {
		passthrough.push(String(input instanceof Request ? input.url : input));

		return Promise.resolve(new Response('ok', { status: 200 }));
	}) as typeof window.fetch;

	remoteAccessStore.installInterceptor();

	return fetch(url);
}

afterEach(() => {
	remoteAccessStore.uninstallInterceptor();
	window.fetch = originalFetch;
});

it('starts a paired server idle', () => {
	settingsStore.updateConfig(
		SETTINGS_KEYS.SERVERS,
		JSON.stringify([{ code: CODE, id: 'r1', kind: 'remote', name: 'Home' }])
	);
	serversStore.initialize();

	expect(remoteAccessStore.statusOf('r1')).toBe(TunnelStatus.IDLE);
	expect(remoteAccessStore.isConnected('r1')).toBe(false);
	expect(remoteAccessStore.isConnecting('r1')).toBe(false);
});

it('refuses a server it has no tunnel for', async () => {
	const request = withTransport(`${tunnelOrigin('r1')}/props`);

	await expect(request).rejects.toThrow(/is not connected/);

	// the point of the whole exercise: nothing leaked to the serving origin
	expect(passthrough).toEqual([]);
});

it('refuses a tunnel origin no server owns', async () => {
	const request = withTransport('https://ghost.remote.llamacpp.invalid/v1/models');

	await expect(request).rejects.toThrow(/No remote server is registered/);
	expect(passthrough).toEqual([]);
});

it('leaves a real URL to the browser', async () => {
	await withTransport('https://example.com/v1/models');

	expect(passthrough).toEqual(['https://example.com/v1/models']);
});

it('leaves the page origin to the browser', async () => {
	await withTransport('/props');

	expect(passthrough).toEqual(['/props']);
});
