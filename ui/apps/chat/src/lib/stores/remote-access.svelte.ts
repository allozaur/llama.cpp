/**
 * remoteAccessStore - tunnels to remote llama.cpp providers.
 *
 * A remote provider is a `llama-server --connect` host reached over a WebRTC
 * data channel. Its access code is stored on the provider itself, in the
 * provider list the settings carry, so this store owns no persistence: it owns
 * the live tunnels and the transport that routes a request to the right one.
 *
 * Routing works on the address, not on the origin. Every request addressed at
 * a provider's synthetic tunnel origin (`tunnelOrigin`) is answered by that
 * provider's data channel, and every other request is left to the browser. A
 * request addressed at a tunnel origin that has no live tunnel is refused here
 * and never reaches the server serving this UI: the origin cannot resolve, so a
 * missed call site fails loudly instead of talking to the wrong server.
 *
 * Tunnels are opened lazily. Only the provider the app opens with is connected
 * during startup; the rest connect when they are first needed - a model of
 * theirs is picked, or the user hits Connect on their card.
 */

import { browser } from '$app/environment';
import { CODE_LENGTHS } from '$lib/constants';
import { TunnelStatus } from '$lib/enums';
import type { Backend } from '$lib/types';
import { getBackends } from '$lib/utils/api-base';
import { codeOf, isRemoteBackend, parseTunnelOrigin, tunnelHostLabel } from '$lib/utils/backend';
import { ClientTunnel } from '$lib/utils/webrtc-tunnel';

/** Providers reached over a tunnel, in list order. */
function remoteBackends(): Backend[] {
	return getBackends().filter(isRemoteBackend);
}

class RemoteAccessStore {
	/** Last tunnel failure by provider id. */
	errorMessage = $state<Record<string, string>>({});
	/** Tunnel state by provider id; providers with no state never attempted a tunnel. */
	status = $state<Record<string, TunnelStatus>>({});

	/** In-flight handshakes by provider id, so a second caller joins the first. */
	private attempts = new Map<string, Promise<void>>();
	private originalFetch: typeof window.fetch | null = null;
	/** Live tunnels by provider id. */
	private tunnels = new Map<string, ClientTunnel>();
	/** Requests held back while their provider's handshake runs. */
	private waiters = new Map<string, Array<{ reject: (e: Error) => void; resolve: () => void }>>();

	/**
	 * Open the tunnel of a remote provider, or join the handshake already running.
	 *
	 * Resolves once the data channel is open and the pass code was accepted.
	 */
	async connect(backendId: string): Promise<void> {
		if (this.isConnected(backendId)) return;

		const running = this.attempts.get(backendId);

		if (running) return running;

		const attempt = this.open(backendId).finally(() => {
			if (this.attempts.get(backendId) === attempt) this.attempts.delete(backendId);
		});

		this.attempts.set(backendId, attempt);

		return attempt;
	}

	/** Close a provider's tunnel and forget its state; the provider itself stays. */
	disconnect(backendId: string): void {
		this.tunnels.get(backendId)?.disconnect();
		this.tunnels.delete(backendId);
		this.errorMessage[backendId] = '';
		this.rejectWaiters(backendId, new Error('Remote access closed'));

		// a provider that was never connected has no state to clear
		if (backendId in this.status) delete this.status[backendId];
	}

	/** Last tunnel failure of a provider. */
	errorOf(backendId: string): string {
		return this.errorMessage[backendId] ?? '';
	}

	/**
	 * Replace `window.fetch` with the tunnel transport.
	 *
	 * Called from `hydrateStores`, before any request goes out. A provider is
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

	isConnected(backendId: string): boolean {
		return this.statusOf(backendId) === TunnelStatus.CONNECTED;
	}

	isConnecting(backendId: string): boolean {
		return this.statusOf(backendId) === TunnelStatus.CONNECTING;
	}

	/**
	 * Answer a request addressed at a tunnel origin.
	 *
	 * @param label Host label of the origin the request was addressed at.
	 */
	async request(label: string, input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
		const backend = this.findByHostLabel(label);

		// A tunnel origin that no provider owns is never served: the request was
		// built for a provider that is gone, or aimed at the suffix on purpose.
		if (!backend) {
			throw new Error(`No remote provider is registered for the tunnel host "${label}"`);
		}

		const tunnel = this.tunnels.get(backend.id);

		if (tunnel?.isConnected) return tunnel.fetch(input, init);

		if (this.status[backend.id] === TunnelStatus.CONNECTING) {
			await new Promise<void>((resolve, reject) => {
				const queued = this.waiters.get(backend.id) ?? [];

				queued.push({ reject, resolve });
				this.waiters.set(backend.id, queued);
			});

			// the handshake resolved; if the channel died before this ran, the
			// provider is simply not connected and says so
			const opened = this.tunnels.get(backend.id);

			if (!opened?.isConnected) {
				throw new Error(`"${backend.name}" disconnected while the request was waiting`);
			}

			return opened.fetch(input, init);
		}

		throw new Error(
			`"${backend.name}" is not connected. Reconnect it in the providers dialog, ` +
				'or pick a model of another provider.'
		);
	}

	/** Tunnel state of a provider. */
	statusOf(backendId: string): TunnelStatus {
		return this.status[backendId] ?? TunnelStatus.IDLE;
	}

	/**
	 * Drop the tunnels of providers that left the list or were disabled, so a
	 * disabled provider stops holding a data channel open.
	 */
	syncProviders(): void {
		const kept = new Set(
			remoteBackends()
				.filter((backend) => backend.enabled)
				.map((b) => b.id)
		);

		for (const backendId of [...this.tunnels.keys()]) {
			if (!kept.has(backendId)) this.disconnect(backendId);
		}

		for (const backendId of Object.keys(this.status)) {
			if (!kept.has(backendId)) {
				delete this.status[backendId];
				delete this.errorMessage[backendId];
			}
		}
	}

	uninstallInterceptor(): void {
		if (!this.originalFetch) return;

		window.fetch = this.originalFetch;
		this.originalFetch = null;
	}

	/** Provider whose tunnel origin carries this host label. */
	private findByHostLabel(label: string): Backend | undefined {
		return remoteBackends().find((backend) => tunnelHostLabel(backend.id) === label);
	}

	/** Handshake a provider's tunnel is not already running. */
	private async open(backendId: string): Promise<void> {
		const backend = getBackends().find((candidate) => candidate.id === backendId);

		if (!isRemoteBackend(backend) || !codeOf(backend)) {
			throw new Error('This provider has no usable access code');
		}

		this.status[backendId] = TunnelStatus.CONNECTING;
		this.errorMessage[backendId] = '';

		const code = codeOf(backend);
		const tunnel = new ClientTunnel(
			code.slice(0, CODE_LENGTHS.ROOM),
			code.slice(CODE_LENGTHS.ROOM),
			{
				onConnected: () => {
					this.status[backendId] = TunnelStatus.CONNECTED;
				},
				onDisconnected: () => {
					// the channel died: the provider stays registered, its requests fail
					// loudly until it is reconnected
					this.status[backendId] = TunnelStatus.ERROR;
					this.errorMessage[backendId] = 'Disconnected from the host';
					this.tunnels.delete(backendId);
					this.rejectWaiters(backendId, new Error('Remote access disconnected'));
				}
			}
		);

		try {
			await tunnel.connect();
			this.tunnels.set(backendId, tunnel);
			this.status[backendId] = TunnelStatus.CONNECTED;
			this.releaseWaiters(backendId);
		} catch (error: unknown) {
			tunnel.disconnect();
			this.tunnels.delete(backendId);
			this.status[backendId] = TunnelStatus.ERROR;
			this.errorMessage[backendId] = error instanceof Error ? error.message : String(error);
			this.rejectWaiters(backendId, error instanceof Error ? error : new Error(String(error)));

			throw error;
		}
	}

	private rejectWaiters(backendId: string, error: Error): void {
		for (const waiter of this.waiters.get(backendId) ?? []) waiter.reject(error);
		this.waiters.delete(backendId);
	}

	private releaseWaiters(backendId: string): void {
		for (const waiter of this.waiters.get(backendId) ?? []) waiter.resolve();
		this.waiters.delete(backendId);
	}
}

export const remoteAccessStore = new RemoteAccessStore();
