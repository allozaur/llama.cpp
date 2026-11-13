/**
 * remoteAccessStore - tunnels to remote llama.cpp servers.
 *
 * A remote server is a `llama-server --connect` host reached over a WebRTC
 * data channel. Its access code is stored on the server itself, in the
 * server list the settings carry, so this store owns no persistence: it owns
 * the live tunnels and the transport that routes a request to the right one.
 *
 * Routing works on the address, not on the origin. Every request addressed at
 * a server's synthetic tunnel origin (`tunnelOrigin`) is answered by that
 * server's data channel, and every other request is left to the browser. A
 * request addressed at a tunnel origin that has no live tunnel is refused here
 * and never reaches the server serving this UI: the origin cannot resolve, so a
 * missed call site fails loudly instead of talking to the wrong server.
 *
 * Tunnels are opened lazily. Only the server the app opens with is connected
 * during startup; the rest connect when they are first needed - a model of
 * theirs is picked, or the user hits Connect on their card.
 *
 * The whole transport is experimental and sits behind a setting that is off by
 * default: while it is off no tunnel opens, and the ones already open close.
 */

import { browser } from '$app/environment';
import { CODE_LENGTHS, SETTINGS_KEYS, WEBRTC_TIMEOUTS } from '$lib/constants';
import { TunnelStatus } from '$lib/enums';
// direct import between stores, not via the barrel, to avoid circular deps
import { settingsStore } from '$lib/stores/settings/index.svelte';
import type { Server } from '$lib/types';
import { getServers } from '$lib/utils/api-base';
import { codeOf, isRemoteServer, parseTunnelOrigin, tunnelHostLabel } from '$lib/utils/server';
import { ClientTunnel } from '$lib/utils/webrtc-tunnel';

/** Servers reached over a tunnel, in list order. */
function remoteServers(): Server[] {
	return getServers().filter(isRemoteServer);
}

class RemoteAccessStore {
	/** Last tunnel failure by server id. */
	errorMessage = $state<Record<string, string>>({});
	/** Tunnel state by server id; servers with no state never attempted a tunnel. */
	status = $state<Record<string, TunnelStatus>>({});

	/** In-flight handshakes by server id, so a second caller joins the first. */
	private attempts = new Map<string, Promise<void>>();
	/**
	 * Handshake count by server id, bumped when an attempt is dropped, so an
	 * answer that lands after the user gave up is not stored.
	 */
	private generation = new Map<string, number>();
	private originalFetch: typeof window.fetch | null = null;
	/** Pending visibility recovery, so one burst of tab switches opens one handshake. */
	private recoverTimer: ReturnType<typeof setTimeout> | null = null;
	/** Live tunnels by server id. */
	private tunnels = new Map<string, ClientTunnel>();
	/** Requests held back while their server's handshake runs. */
	private waiters = new Map<string, Array<{ reject: (e: Error) => void; resolve: () => void }>>();

	/** Whether the experimental remote pairing is turned on; every entry point hides without it. */
	get isEnabled(): boolean {
		return Boolean(settingsStore.getConfig(SETTINGS_KEYS.ENABLE_REMOTE_PAIRING));
	}

	/**
	 * Open the tunnel of a remote server, or join the handshake already running.
	 *
	 * Resolves once the data channel is open and the pass code was accepted.
	 */
	async connect(serverId: string): Promise<void> {
		if (this.isConnected(serverId)) return;

		const running = this.attempts.get(serverId);

		if (running) return running;

		const generation = this.generationOf(serverId);
		const attempt = this.open(serverId, generation).finally(() => {
			if (this.attempts.get(serverId) === attempt) this.attempts.delete(serverId);
		});

		this.attempts.set(serverId, attempt);

		return attempt;
	}

	/** Close a server's tunnel and forget its state; the server itself stays. */
	disconnect(serverId: string): void {
		// a handshake still running must land on nothing: the channel is not wanted
		this.dropAttempt(serverId);
		this.tunnels.get(serverId)?.disconnect();
		this.tunnels.delete(serverId);
		this.errorMessage[serverId] = '';
		this.rejectWaiters(serverId, new Error('Remote access closed'));

		// a server that was never connected has no state to clear
		if (serverId in this.status) delete this.status[serverId];
	}

	/** Last tunnel failure of a server. */
	errorOf(serverId: string): string {
		return this.errorMessage[serverId] ?? '';
	}

	/**
	 * Replace `window.fetch` with the tunnel transport.
	 *
	 * Called from `hydrateStores`, before any request goes out. A server is
	 * recognised by its host label rather than by the page origin, so several
	 * tunnels coexist and requests to real URLs are untouched.
	 */
	installInterceptor(): void {
		if (!browser || this.originalFetch) return;

		this.originalFetch = window.fetch.bind(window);
		const original = this.originalFetch;

		window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
			try {
				const href =
					input instanceof Request ? input.url : input instanceof URL ? input.href : String(input);
				const label = parseTunnelOrigin(href);

				if (label !== null) return this.request(label, input, init);
			} catch {
				// unparseable input: it is not addressed at a tunnel
			}

			return original(input, init);
		};
	}

	isConnected(serverId: string): boolean {
		return this.statusOf(serverId) === TunnelStatus.CONNECTED;
	}

	isConnecting(serverId: string): boolean {
		return this.statusOf(serverId) === TunnelStatus.CONNECTING;
	}

	/**
	 * Reconnect the channels a backgrounded tab lost.
	 *
	 * iOS Safari and Android PWAs tear a peer connection down when the tab goes
	 * to the background, which leaves the card on a failure the user can only
	 * clear with the retry icon. Only a channel that was already wanted is
	 * recovered: an idle server is one nobody asked to connect. The recovery
	 * stays silent, so a failure just lands back on the card.
	 */
	recoverChannels(): void {
		if (!browser) return;

		// a tab switch is not the network being back: let the connection settle,
		// and let a burst of switches coalesce into one attempt per server
		if (this.recoverTimer) clearTimeout(this.recoverTimer);

		this.recoverTimer = setTimeout(() => {
			this.recoverTimer = null;

			if (navigator.onLine === false) return;

			for (const server of remoteServers()) {
				if (!server.enabled || this.statusOf(server.id) !== TunnelStatus.ERROR) continue;

				void this.connect(server.id).catch(() => {
					// the card keeps the failure and offers the retry control
				});
			}
		}, WEBRTC_TIMEOUTS.RECOVER_MS);
	}

	/**
	 * Answer a request addressed at a tunnel origin.
	 *
	 * @param label Host label of the origin the request was addressed at.
	 */
	async request(label: string, input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
		const server = this.findByHostLabel(label);

		// A tunnel origin that no server owns is never served: the request was
		// built for a server that is gone, or aimed at the suffix on purpose.
		if (!server) {
			throw new Error(`No remote server is registered for the tunnel host "${label}"`);
		}

		const tunnel = this.tunnels.get(server.id);

		if (tunnel?.isConnected) return tunnel.fetch(input, init);

		if (this.status[server.id] === TunnelStatus.CONNECTING) {
			await new Promise<void>((resolve, reject) => {
				const queued = this.waiters.get(server.id) ?? [];

				queued.push({ reject, resolve });
				this.waiters.set(server.id, queued);
			});

			// the handshake resolved; if the channel died before this ran, the
			// server is simply not connected and says so
			const opened = this.tunnels.get(server.id);

			if (!opened?.isConnected) {
				throw new Error(`"${server.name}" disconnected while the request was waiting`);
			}

			return opened.fetch(input, init);
		}

		throw new Error(
			`"${server.name}" is not connected. Reconnect it in the servers dialog, ` +
				'or pick a model of another server.'
		);
	}

	/** Tunnel state of a server. */
	statusOf(serverId: string): TunnelStatus {
		return this.status[serverId] ?? TunnelStatus.IDLE;
	}

	/**
	 * Drop the tunnels of servers that left the list or were disabled, so a
	 * disabled server stops holding a data channel open. Turning remote pairing
	 * off disables them all.
	 */
	syncServers(): void {
		const kept = new Set(
			this.isEnabled
				? remoteServers()
						.filter((server) => server.enabled)
						.map((b) => b.id)
				: []
		);

		for (const serverId of [...this.tunnels.keys()]) {
			if (!kept.has(serverId)) this.disconnect(serverId);
		}

		for (const serverId of Object.keys(this.status)) {
			if (!kept.has(serverId)) {
				delete this.status[serverId];
				delete this.errorMessage[serverId];
			}
		}
	}

	uninstallInterceptor(): void {
		if (!this.originalFetch) return;

		window.fetch = this.originalFetch;
		this.originalFetch = null;
	}

	/**
	 * Give up on a server's handshake: a later answer must land on nothing, and a
	 * caller asking again must start over instead of joining the dropped attempt.
	 */
	private dropAttempt(serverId: string): void {
		this.generation.set(serverId, this.generationOf(serverId) + 1);
		this.attempts.delete(serverId);
	}

	/** Server whose tunnel origin carries this host label. */
	private findByHostLabel(label: string): Server | undefined {
		return remoteServers().find((server) => tunnelHostLabel(server.id) === label);
	}

	private generationOf(serverId: string): number {
		return this.generation.get(serverId) ?? 0;
	}

	/** Handshake a server's tunnel is not already running. */
	private async open(serverId: string, generation: number): Promise<void> {
		const server = getServers().find((candidate) => candidate.id === serverId);

		if (!this.isEnabled) {
			throw new Error(
				'Remote server pairing is turned off. Turn it on in Settings, under General.'
			);
		}

		if (!isRemoteServer(server) || !codeOf(server)) {
			throw new Error('This server has no usable access code');
		}

		this.status[serverId] = TunnelStatus.CONNECTING;
		this.errorMessage[serverId] = '';

		// a dropped attempt must report nothing: the channel belongs to whoever asked
		// for it last, and this one may land after that
		const stillWanted = () => generation === this.generationOf(serverId);
		const code = codeOf(server);
		const tunnel = new ClientTunnel(
			code.slice(0, CODE_LENGTHS.ROOM),
			code.slice(CODE_LENGTHS.ROOM),
			{
				onConnected: () => {
					if (stillWanted()) this.status[serverId] = TunnelStatus.CONNECTED;
				},
				onDisconnected: () => {
					// the channel died: the server stays registered, its requests fail
					// loudly until it is reconnected
					if (!stillWanted()) return;

					this.status[serverId] = TunnelStatus.ERROR;
					this.errorMessage[serverId] = 'Disconnected from the host';
					this.tunnels.delete(serverId);
					this.rejectWaiters(serverId, new Error('Remote access disconnected'));
				}
			}
		);

		try {
			await tunnel.connect();

			// dropped while the handshake ran: the user is done with this channel, so
			// the answer must not bring it back
			if (!stillWanted()) {
				tunnel.disconnect();

				return;
			}

			this.tunnels.set(serverId, tunnel);
			this.status[serverId] = TunnelStatus.CONNECTED;
			this.releaseWaiters(serverId);
		} catch (error: unknown) {
			tunnel.disconnect();

			// dropped while the handshake ran: the state the user asked for stands,
			// and the failure belongs to an attempt nobody waits on any more
			if (!stillWanted()) throw error;

			this.tunnels.delete(serverId);
			this.status[serverId] = TunnelStatus.ERROR;
			this.errorMessage[serverId] = error instanceof Error ? error.message : String(error);
			this.rejectWaiters(serverId, error instanceof Error ? error : new Error(String(error)));

			throw error;
		}
	}

	private rejectWaiters(serverId: string, error: Error): void {
		for (const waiter of this.waiters.get(serverId) ?? []) waiter.reject(error);
		this.waiters.delete(serverId);
	}

	private releaseWaiters(serverId: string): void {
		for (const waiter of this.waiters.get(serverId) ?? []) waiter.resolve();
		this.waiters.delete(serverId);
	}
}

export const remoteAccessStore = new RemoteAccessStore();
