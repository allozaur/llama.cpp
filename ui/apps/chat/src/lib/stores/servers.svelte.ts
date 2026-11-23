/**
 * serversStore - llama.cpp servers the UI can talk to.
 *
 * The built-in server is the llama-server serving this UI. The others are
 * user-configured: a server on a base URL, or a remote one reached over a
 * WebRTC tunnel by the access code its `llama-server --connect` prints. The
 * store registers the resolved list with the api-base registry, which services
 * use to build request URLs, and tells the remote access store when a tunnel is
 * no longer wanted. A page published with servers (`llama-chat --server`)
 * lists them in `llama-chat.json`, and the store adds each of them once. A
 * page with no server at all starts with llama-server's default address.
 */

import {
	ACTIVE_SERVER_LOCALSTORAGE_KEY,
	LOCAL_BACKEND_ID,
	PRESET_SERVERS_FILE,
	PRESET_SERVERS_LOCALSTORAGE_KEY,
	PRESET_SERVERS_META,
	SETTINGS_KEYS
} from '#lib/constants/index.ts';
import { deviceStore } from '#lib/stores/device.svelte.ts';
import { serverStore } from '#lib/stores/llama-server.svelte.ts';
import { remoteAccessStore } from '#lib/stores/remote-access.svelte.ts';
import { settingsStore } from '#lib/stores/settings/index.svelte.ts';
import type { Server } from '#lib/types/index.ts';
import { setServersResolver } from '#lib/utils/api-base.ts';
import {
	createLocalServer,
	createRemoteServer,
	createUrlServer,
	defaultServerToAdd,
	isRemoteServer,
	parsePresetServers,
	parseServersSettings,
	presetServersToAdd
} from '#lib/utils/servers.ts';
import { uuid } from '#lib/utils/uuid.ts';
import { browser, dev } from '$app/env';

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

function loadSeenPresets(): string[] {
	try {
		const seen: unknown = JSON.parse(localStorage.getItem(PRESET_SERVERS_LOCALSTORAGE_KEY) ?? '[]');

		return Array.isArray(seen) ? seen.filter((url) => typeof url === 'string') : [];
	} catch {
		return [];
	}
}

function persistSeenPresets(urls: string[]): void {
	try {
		localStorage.setItem(PRESET_SERVERS_LOCALSTORAGE_KEY, JSON.stringify(urls));
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
	 * Add llama-server's default address on this computer, for a page that has
	 * no server of its own and none listed: a static build on another host then
	 * finds a llama-server started with its defaults. Added once, like a preset,
	 * so it stays removed when the user removes it.
	 *
	 * @returns the id of the server it added, if it added one
	 */
	addDefaultServer(): string | null {
		// the dev server has its own local server, the one it proxies to, even while that one is down
		if (!browser || dev || !serverStore.localServerMissing) return null;

		const seen = loadSeenPresets();
		const url = defaultServerToAdd(this.external, seen, deviceStore.isTouch);

		if (!url) return null;

		const server = createUrlServer(url, uuid());

		this.saveExternal([...this.external, server]);
		persistSeenPresets([...seen, url]);

		return server.id;
	}

	/**
	 * Add the servers the page was published with, listed in `llama-chat.json`
	 * next to index.html, each once: one the user removed stays removed. Only a
	 * page whose index.html carries the marker for the file asks for it, so one
	 * served by llama-server or the dev server adds nothing. With
	 * no local server to fall back on, the app picks the first enabled one.
	 *
	 * @returns the ids of the servers it added
	 */
	async addPresetServers(): Promise<string[]> {
		if (!browser || !document.querySelector(`meta[name="${PRESET_SERVERS_META}"]`)) return [];

		let raw: unknown;

		try {
			const response = await fetch(`./${PRESET_SERVERS_FILE}`, { cache: 'no-cache' });

			if (!response.ok) return [];

			raw = await response.json();
		} catch {
			// not there, or not JSON: an SPA fallback that answers with index.html
			return [];
		}

		const urls = parsePresetServers(raw);

		if (urls.length === 0) return [];

		const seen = loadSeenPresets();
		const added = presetServersToAdd(urls, this.external, seen).map((url) =>
			createUrlServer(url, uuid())
		);

		if (added.length > 0) this.saveExternal([...this.external, ...added]);

		persistSeenPresets([...new Set([...seen, ...urls])]);

		return added.map((server) => server.id);
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
