/**
 * backendsStore - llama.cpp servers the UI can talk to.
 *
 * The built-in backend is the llama-server serving this UI. The others are
 * user-configured: a server on a base URL, or a remote one reached over a
 * WebRTC tunnel by the access code its `llama-server --connect` prints. The
 * store registers the resolved list with the api-base registry, which services
 * use to build request URLs, and tells the remote access store when a tunnel is
 * no longer wanted.
 */

import { browser } from '$app/environment';
import { ACTIVE_BACKEND_LOCALSTORAGE_KEY, LOCAL_BACKEND_ID, SETTINGS_KEYS } from '$lib/constants';
import { remoteAccessStore } from '$lib/stores/remote-access.svelte';
import { serverStore } from '$lib/stores/server.svelte';
import { settingsStore } from '$lib/stores/settings/index.svelte';
import type { Backend } from '$lib/types';
import { setBackendsResolver } from '$lib/utils/api-base';
import {
	createLocalBackend,
	createRemoteBackend,
	isRemoteBackend,
	parseBackendsSettings
} from '$lib/utils/backend';
import { uuid } from '$lib/utils/uuid';

function loadActiveBackendId(): string {
	if (!browser) return LOCAL_BACKEND_ID;

	try {
		return localStorage.getItem(ACTIVE_BACKEND_LOCALSTORAGE_KEY) ?? LOCAL_BACKEND_ID;
	} catch {
		return LOCAL_BACKEND_ID;
	}
}

function persistActiveBackendId(backendId: string): void {
	if (!browser) return;

	try {
		localStorage.setItem(ACTIVE_BACKEND_LOCALSTORAGE_KEY, backendId);
	} catch {
		/* ignore */
	}
}

class BackendsStore {
	activeId = $state<string>(loadActiveBackendId());

	get active(): Backend {
		const active = this.enabled.find((backend) => backend.id === this.activeId);

		return active ?? this.enabled[0] ?? this.local;
	}

	get enabled(): Backend[] {
		return this.list.filter((backend) => backend.enabled && !this.isMissingLocal(backend));
	}

	/** Every remote provider, connected or not; their code is the credential. */
	get external(): Backend[] {
		return parseBackendsSettings(settingsStore.config[SETTINGS_KEYS.BACKENDS]);
	}

	get list(): Backend[] {
		return [this.local, ...this.external];
	}

	get local(): Backend {
		return createLocalBackend(
			settingsStore.config.apiKey?.toString().trim() || undefined,
			settingsStore.config[SETTINGS_KEYS.LOCAL_BACKEND_ENABLED] !== false
		);
	}

	/** Providers a tunnel can be opened to, enabled or not. */
	get remote(): Backend[] {
		return this.external.filter(isRemoteBackend);
	}

	/** Point at a llama.cpp server on its own base URL. */
	addBackend(backend: Backend): void {
		this.saveExternal([...this.external, backend]);
	}

	/**
	 * Pair with a `llama-server --connect` host by its access code.
	 *
	 * The tunnel is not opened here: the caller decides when the handshake is
	 * worth running (the providers dialog tests it, startup only tests the
	 * provider the app opens with).
	 */
	addRemoteBackend(code: string, name?: string, id?: string): Backend {
		const backend = createRemoteBackend(code, id ?? uuid(), name);

		this.saveExternal([...this.external, backend]);

		return backend;
	}

	initialize(): void {
		if (!browser) return;

		setBackendsResolver(() => ({ activeId: this.active.id, backends: this.list }));
	}

	removeBackend(backendId: string): void {
		this.saveExternal(this.external.filter((backend) => backend.id !== backendId));

		// the code is the credential: dropping the provider drops the tunnel too,
		// and the store forgets its state on the next sync
		remoteAccessStore.disconnect(backendId);
		remoteAccessStore.syncProviders();

		if (this.activeId === backendId) {
			this.setActive(LOCAL_BACKEND_ID);
		}
	}

	setActive(backendId: string): void {
		const id = this.list.some((backend) => backend.id === backendId) ? backendId : LOCAL_BACKEND_ID;

		this.activeId = id;
		persistActiveBackendId(id);
	}

	setLocalEnabled(enabled: boolean): void {
		settingsStore.updateConfig(SETTINGS_KEYS.LOCAL_BACKEND_ENABLED, enabled);
	}

	updateBackend(backendId: string, updates: Partial<Backend>): void {
		this.saveExternal(
			this.external.map((backend) =>
				backend.id === backendId ? { ...backend, ...updates } : backend
			)
		);

		// a disabled or re-coded provider must not keep its data channel
		remoteAccessStore.syncProviders();
	}

	/** The built-in backend counts only when a local server answered this session. */
	private isMissingLocal(backend: Backend): boolean {
		return backend.id === LOCAL_BACKEND_ID && serverStore.localServerMissing;
	}

	private saveExternal(backends: Backend[]): void {
		settingsStore.updateConfig(SETTINGS_KEYS.BACKENDS, JSON.stringify(backends));
	}
}

export const backendsStore = new BackendsStore();
