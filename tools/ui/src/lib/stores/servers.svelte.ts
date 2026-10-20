/**
 * serversStore - llama.cpp servers the UI can talk to.
 *
 * The built-in server is the llama-server serving this UI. The others are
 * user-configured: a server on a base URL, or a remote one reached over a
 * WebRTC tunnel by the access code its `llama-server --connect` prints. The
 * store registers the resolved list with the api-base registry, which services
 * use to build request URLs, and tells the remote access store when a tunnel is
 * no longer wanted.
 */

import { browser } from '$app/environment';
import { ACTIVE_SERVER_LOCALSTORAGE_KEY, LOCAL_BACKEND_ID, SETTINGS_KEYS } from '$lib/constants';
import { remoteAccessStore } from '$lib/stores/remote-access.svelte';
import { serverStore } from '$lib/stores/server.svelte';
import { settingsStore } from '$lib/stores/settings/index.svelte';
import type { Server } from '$lib/types';
import { setServersResolver } from '$lib/utils/api-base';
import {
	createLocalServer,
	createRemoteServer,
	isRemoteServer,
	parseServersSettings
} from '$lib/utils/server';
import { uuid } from '$lib/utils/uuid';

function loadActiveServerId(): string {
	if (!browser) return LOCAL_BACKEND_ID;

	try {
		return localStorage.getItem(ACTIVE_SERVER_LOCALSTORAGE_KEY) ?? LOCAL_BACKEND_ID;
	} catch {
		return LOCAL_BACKEND_ID;
	}
}

function persistActiveServerId(serverId: string): void {
	if (!browser) return;

	try {
		localStorage.setItem(ACTIVE_SERVER_LOCALSTORAGE_KEY, serverId);
	} catch {
		/* ignore */
	}
}

class ServersStore {
	activeId = $state<string>(loadActiveServerId());

	get active(): Server {
		const active = this.enabled.find((server) => server.id === this.activeId);

		return active ?? this.enabled[0] ?? this.local;
	}

	get enabled(): Server[] {
		return this.list.filter((server) => server.enabled && !this.isMissingLocal(server));
	}

	/** Every remote server, connected or not; their code is the credential. */
	get external(): Server[] {
		return parseServersSettings(settingsStore.config[SETTINGS_KEYS.SERVERS]);
	}

	get list(): Server[] {
		return [this.local, ...this.external];
	}

	get local(): Server {
		return createLocalServer(
			settingsStore.config.apiKey?.toString().trim() || undefined,
			settingsStore.config[SETTINGS_KEYS.LOCAL_BACKEND_ENABLED] !== false
		);
	}

	/** Servers a tunnel can be opened to, enabled or not. */
	get remote(): Server[] {
		return this.external.filter(isRemoteServer);
	}

	/**
	 * Pair with a `llama-server --connect` host by its access code.
	 *
	 * The tunnel is not opened here: the caller decides when the handshake is
	 * worth running (the servers dialog tests it, startup only tests the
	 * server the app opens with).
	 */
	addRemoteServer(code: string, name?: string, id?: string, apiKey?: string): Server {
		const server = createRemoteServer(code, id ?? uuid(), name, apiKey);

		this.saveExternal([...this.external, server]);

		return server;
	}

	/** Point at a llama.cpp server on its own base URL. */
	addServer(server: Server): void {
		this.saveExternal([...this.external, server]);
	}

	initialize(): void {
		if (!browser) return;

		setServersResolver(() => ({ activeId: this.active.id, servers: this.list }));
	}

	removeServer(serverId: string): void {
		this.saveExternal(this.external.filter((server) => server.id !== serverId));

		// the code is the credential: dropping the server drops the tunnel too,
		// and the store forgets its state on the next sync
		remoteAccessStore.disconnect(serverId);
		remoteAccessStore.syncServers();

		if (this.activeId === serverId) {
			this.setActive(LOCAL_BACKEND_ID);
		}
	}

	setActive(serverId: string): void {
		const id = this.list.some((server) => server.id === serverId) ? serverId : LOCAL_BACKEND_ID;

		this.activeId = id;
		persistActiveServerId(id);
	}

	setLocalEnabled(enabled: boolean): void {
		settingsStore.updateConfig(SETTINGS_KEYS.LOCAL_BACKEND_ENABLED, enabled);
	}

	updateServer(serverId: string, updates: Partial<Server>): void {
		this.saveExternal(
			this.external.map((server) => (server.id === serverId ? { ...server, ...updates } : server))
		);

		// a disabled or re-coded server must not keep its data channel
		remoteAccessStore.syncServers();
	}

	/** The built-in server counts only when a local server answered this session. */
	private isMissingLocal(server: Server): boolean {
		return server.id === LOCAL_BACKEND_ID && serverStore.localServerMissing;
	}

	private saveExternal(servers: Server[]): void {
		settingsStore.updateConfig(SETTINGS_KEYS.SERVERS, JSON.stringify(servers));
	}
}

export const serversStore = new ServersStore();
