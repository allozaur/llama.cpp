// Guards the transport rule the whole remote-server feature leans on: a request
// addressed at a server's tunnel origin is answered by that server's tunnel or
// refused out loud - it never quietly reaches the server serving this UI. The
// card is checked here too: what it says about a channel is what the user acts on.

import ServerCardWrapper from './components/ServerCardWrapper.svelte';
import {
	API_MODELS,
	CODE_CHARS,
	CODE_LENGTHS,
	LOCAL_BACKEND_ID,
	SETTINGS_KEYS,
	WEBRTC_TIMEOUTS
} from '$lib/constants';
import { TunnelStatus } from '$lib/enums';
import {
	modelsStore,
	remoteAccessStore,
	serversStore,
	serverStore,
	settingsStore
} from '$lib/stores';
import type { ApiLlamaCppServerProps } from '$lib/types';
import { createRemoteServer, tunnelOrigin } from '$lib/utils/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';

const { FakeTunnel } = vi.hoisted(() => {
	/**
	 * Stands in for the transport: a handshake the test settles by hand, so an
	 * attempt the user gave up on can be examined without a live tracker.
	 */
	class FakeTunnel {
		disconnected = false;
		static instances: FakeTunnel[] = [];
		onConnected: (() => void) | undefined;
		settle: (() => void) | undefined;

		get isConnected(): boolean {
			return !this.disconnected;
		}

		connect(): Promise<void> {
			return new Promise<void>((resolve) => {
				this.settle = resolve;
			});
		}

		constructor(_room: string, _pass: string, callbacks: { onConnected?: () => void } = {}) {
			this.onConnected = callbacks.onConnected;
			FakeTunnel.instances.push(this);
		}

		disconnect(): void {
			this.disconnected = true;
		}
	}

	return { FakeTunnel };
});

vi.mock('$lib/utils/webrtc-tunnel', () => ({ ClientTunnel: FakeTunnel }));

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

// pairing is an experimental opt-in; these tests exercise it switched on
beforeEach(() => {
	settingsStore.updateConfig(SETTINGS_KEYS.ENABLE_REMOTE_PAIRING, true);
});

afterEach(() => {
	remoteAccessStore.uninstallInterceptor();
	window.fetch = originalFetch;
	settingsStore.updateConfig(SETTINGS_KEYS.ENABLE_REMOTE_PAIRING, false);
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

/** The remote server the card tests below are about. */
const REMOTE = createRemoteServer(CODE, 'r1', 'Home');

/** A tunnel status the card reads back for `r1`, without a transport behind it. */
function withTunnel(tunnel: TunnelStatus, error = '') {
	remoteAccessStore.status['r1'] = tunnel;
	remoteAccessStore.errorMessage['r1'] = error;
}

describe('server card', () => {
	beforeEach(() => {
		// the local card only reports the host of the server the app opens with
		serversStore.setActive(LOCAL_BACKEND_ID);
	});

	afterEach(() => {
		delete remoteAccessStore.status['r1'];
		delete remoteAccessStore.errorMessage['r1'];
		serverStore.props = null;
	});

	it('renders the host this machine runs, and pairs with its code', async () => {
		serverStore.props = { connect_code: CODE } as ApiLlamaCppServerProps;
		const paired: string[] = [];
		const screen = render(ServerCardWrapper, {
			isLocal: true,
			onPair: (code: string) => paired.push(code),
			server: serversStore.local
		});

		await expect.element(screen.getByText('Remote access: on')).toBeVisible();
		await expect
			.element(screen.getByText('This server can be reached through its access code.'))
			.toBeVisible();

		await screen.getByRole('button', { name: 'Pair' }).click();

		expect(paired).toEqual([CODE]);
	});

	it('renders no host side for a machine without one', async () => {
		serverStore.props = {} as ApiLlamaCppServerProps;

		const screen = render(ServerCardWrapper, { isLocal: true, server: serversStore.local });

		await expect.element(screen.getByText('Remote access: on')).not.toBeInTheDocument();
	});

	it('offers the host code as a QR the other device can scan', async () => {
		serverStore.props = { connect_code: CODE } as ApiLlamaCppServerProps;

		const screen = render(ServerCardWrapper, { isLocal: true, server: serversStore.local });

		await expect.element(screen.getByText('Remote access: on')).toBeVisible();

		// the QR is behind its own control: the card stays compact until it is asked for
		expect(document.querySelector('img[alt="Access code QR code"]')).toBeNull();

		await screen.getByRole('button', { name: 'Show the access code as a QR code' }).click();

		const qr = screen.getByAltText('Access code QR code');

		await expect.element(qr).toBeVisible();
		expect((qr.element() as HTMLImageElement).src.startsWith('data:image/svg+xml')).toBe(true);
	});

	it('offers a way out of a handshake that stalls', async () => {
		withTunnel(TunnelStatus.CONNECTING);

		const screen = render(ServerCardWrapper, { server: REMOTE });

		await expect.element(screen.getByText('Connecting')).toBeVisible();
		await expect
			.element(screen.getByRole('button', { name: 'Disconnect this server' }))
			.toBeVisible();
	});

	it('reports the reason a channel dropped, not just that it did', async () => {
		withTunnel(TunnelStatus.ERROR, 'authentication failed: invalid passcode');

		const screen = render(ServerCardWrapper, { server: REMOTE });

		await expect.element(screen.getByText('Channel down')).toBeVisible();
		await expect.element(screen.getByText('authentication failed: invalid passcode')).toBeVisible();
		await expect
			.element(screen.getByRole('button', { name: 'Reconnect to the host' }))
			.toBeVisible();
	});

	it('keeps an idle server a choice, with the code in reach', async () => {
		const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();
		const screen = render(ServerCardWrapper, { server: REMOTE });

		await expect.element(screen.getByText('Not connected')).toBeVisible();
		await expect
			.element(screen.getByText('Paste the code the host prints, or press Connect.'))
			.toBeVisible();

		await screen.getByRole('button', { name: 'Copy the access code' }).click();

		expect(writeText).toHaveBeenCalledWith(CODE);

		await expect.element(screen.getByText('Not connected')).toBeVisible();
	});

	it('reveals the code a server stores', async () => {
		const screen = render(ServerCardWrapper, { server: REMOTE });

		await screen.getByTitle('Show the access code').click();

		await expect.element(screen.getByText(CODE)).toBeVisible();
	});
});

describe('the status feed of a tunneled router', () => {
	const calls: string[] = [];

	beforeEach(() => {
		calls.length = 0;
		settingsStore.updateConfig(
			SETTINGS_KEYS.SERVERS,
			JSON.stringify([{ code: CODE, id: 'r1', kind: 'remote', name: 'Home' }])
		);
		serversStore.initialize();
		vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: RequestInfo | URL) => {
			calls.push(String(input instanceof Request ? input.url : input));

			return new Response(': ping\n\n', { status: 200 });
		});
	});

	afterEach(() => {
		modelsStore.status.subscribeServer(null);
		vi.restoreAllMocks();
	});

	it('reads the feed at the origin of the server it was given', async () => {
		modelsStore.status.subscribeServer('r1');

		await vi.waitFor(() => expect(calls.length).toBeGreaterThan(0));

		// the tunnel carries the feed like any other request: the server's own
		// origin, never the one serving this UI
		expect(calls[0]).toBe(`${tunnelOrigin('r1')}${API_MODELS.SSE}`);
	});

	it('opens one reader per server', async () => {
		modelsStore.status.subscribeServer('r1');
		modelsStore.status.subscribeServer('r1');

		await vi.waitFor(() => expect(calls.length).toBe(1));

		expect(calls.length).toBe(1);
	});

	it('opens nothing for no server', async () => {
		modelsStore.status.subscribeServer(null);

		await new Promise((resolve) => setTimeout(resolve, 20));

		expect(calls).toEqual([]);
	});
});

describe('channels lost to a backgrounded tab', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		settingsStore.updateConfig(
			SETTINGS_KEYS.SERVERS,
			JSON.stringify([
				{ code: CODE, id: 'r1', kind: 'remote', name: 'Home' },
				{ code: CODE, id: 'r2', kind: 'remote', name: 'Office' }
			])
		);
		serversStore.initialize();
		// one channel was open before the tab went away, the other was never asked for
		withTunnel(TunnelStatus.ERROR, 'Disconnected from the host');
		remoteAccessStore.status['r2'] = TunnelStatus.IDLE;
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.restoreAllMocks();
		delete remoteAccessStore.status['r1'];
		delete remoteAccessStore.errorMessage['r1'];
		delete remoteAccessStore.status['r2'];
	});

	it('asks again, and only for a channel that was wanted', async () => {
		const connect = vi.spyOn(remoteAccessStore, 'connect').mockResolvedValue();

		remoteAccessStore.recoverChannels();

		// the network is not back the moment the tab is: nothing happens at once
		expect(connect).not.toHaveBeenCalled();

		await vi.advanceTimersByTimeAsync(WEBRTC_TIMEOUTS.RECOVER_MS);

		expect(connect).toHaveBeenCalledWith('r1');
		expect(connect).not.toHaveBeenCalledWith('r2');
	});

	it('opens one handshake per burst of tab switches', async () => {
		const connect = vi.spyOn(remoteAccessStore, 'connect').mockResolvedValue();

		remoteAccessStore.recoverChannels();
		await vi.advanceTimersByTimeAsync(WEBRTC_TIMEOUTS.RECOVER_MS / 2);
		remoteAccessStore.recoverChannels();
		await vi.advanceTimersByTimeAsync(WEBRTC_TIMEOUTS.RECOVER_MS);

		expect(connect).toHaveBeenCalledTimes(1);
	});
});

describe('a handshake the user gives up on', () => {
	beforeEach(() => {
		FakeTunnel.instances = [];
		settingsStore.updateConfig(
			SETTINGS_KEYS.SERVERS,
			JSON.stringify([{ code: CODE, id: 'r1', kind: 'remote', name: 'Home' }])
		);
		serversStore.initialize();
	});

	afterEach(() => {
		remoteAccessStore.disconnect('r1');
	});

	it('leaves the server idle when the answer lands late', async () => {
		const attempt = remoteAccessStore.connect('r1');
		const [tunnel] = FakeTunnel.instances;

		remoteAccessStore.disconnect('r1');

		// the host answers after the user stopped waiting
		tunnel.onConnected?.();
		tunnel.settle?.();

		await attempt;

		expect(remoteAccessStore.statusOf('r1')).toBe(TunnelStatus.IDLE);
		expect(remoteAccessStore.isConnected('r1')).toBe(false);
		expect(tunnel.disconnected).toBe(true);
	});

	it('starts a fresh handshake when asked again', async () => {
		const dropped = remoteAccessStore.connect('r1');

		remoteAccessStore.disconnect('r1');

		const kept = remoteAccessStore.connect('r1');
		const [first, second] = FakeTunnel.instances;

		expect(second).not.toBe(first);

		second.onConnected?.();
		second.settle?.();
		await kept;

		expect(remoteAccessStore.isConnected('r1')).toBe(true);

		// the dropped attempt landing now must not close the one that is up
		first.settle?.();
		await dropped;

		expect(remoteAccessStore.isConnected('r1')).toBe(true);
		expect(first.disconnected).toBe(true);
	});
});
