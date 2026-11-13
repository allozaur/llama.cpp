/**
 * serversModelsStore - Per-server model catalog cache.
 *
 * Prefetches every enabled server's model list, so switching servers is
 * instant and the switcher can show load state. The active server's list
 * still lives in modelsStore, which owns selection and chat wiring; this
 * cache is the prefetch layer the switches start from.
 *
 * Remote servers are listed through their tunnel, so the prefetch skips one
 * until its tunnel is open: a handshake per server is what `connectAndLoad`
 * is for, never the startup sweep.
 */

import { ModelsService } from '$lib/services/models.service';
import { ServersService } from '$lib/services/servers.service';
import { remoteAccessStore } from '$lib/stores/remote-access.svelte';
import { serversStore } from '$lib/stores/servers.svelte';
import type { Server } from '$lib/types';
import type { ApiModelsListResponse } from '$lib/types';
import type { ModelSidecarFile } from '$lib/types/models';
import type { ModelOption } from '$lib/types/models';
import { isRemoteServer } from '$lib/utils/server';

export interface ServerModelsState {
	/** Draft sidecars the listing carries, keyed by the repo they belong to. */
	drafts?: Record<string, ModelSidecarFile[]>;
	error: string | null;
	loaded: boolean;
	loading: boolean;
	models: ModelOption[];
	/** Untouched list payload, kept for the local server so its router rows survive a tab switch. */
	raw?: ApiModelsListResponse;
}

const EMPTY_STATE: ServerModelsState = {
	error: null,
	loaded: false,
	loading: false,
	models: []
};

class ServersModelsStore {
	private states = $state<Record<string, ServerModelsState>>({});

	clear(serverId: string): void {
		delete this.states[serverId];
	}

	/**
	 * Open a remote server's tunnel and list it.
	 *
	 * The card's Connect action and the server switch both want this; startup
	 * prefetch does not, since a handshake per server on first paint is not what
	 * a list of servers asked for.
	 */
	async connectAndLoad(serverId: string): Promise<void> {
		await this.ensureLoaded(serverId, { connect: true });
	}

	/**
	 * Load a server's models once.
	 *
	 * @param connect - Open the tunnel of a remote server when it has none. Off
	 * by default: the startup prefetch must not handshake with every server.
	 */
	async ensureLoaded(serverId: string, options?: { connect?: boolean }): Promise<void> {
		const server = serversStore.enabled.find((candidate) => candidate.id === serverId);

		if (!server) return;

		const state = this.states[serverId];

		if (state?.loaded || state?.loading) return;

		if (isRemoteServer(server) && !remoteAccessStore.isConnected(serverId)) {
			if (!options?.connect) return;

			this.states[serverId] = { error: null, loaded: false, loading: true, models: [] };

			try {
				await remoteAccessStore.connect(serverId);
			} catch (error: unknown) {
				this.states[serverId] = {
					error: error instanceof Error ? error.message : String(error),
					loaded: false,
					loading: false,
					models: []
				};

				return;
			}
		}

		this.states[serverId] = { error: null, loaded: false, loading: true, models: [] };
		await this.fetch(server);
	}

	get(serverId: string): ServerModelsState {
		return this.states[serverId] ?? EMPTY_STATE;
	}

	/** Prefetch every enabled server's model list. */
	async loadAll(): Promise<void> {
		const enabled = serversStore.enabled;
		const ids = new Set(enabled.map((server) => server.id));

		for (const id of Object.keys(this.states)) {
			if (!ids.has(id)) {
				delete this.states[id];
			}
		}

		await Promise.all(enabled.map((server) => this.ensureLoaded(server.id)));
	}

	/**
	 * Ask a server for its list again, keeping what is already known. Used while
	 * a remote load settles, since its status never reaches the local feed.
	 */
	async refresh(serverId: string): Promise<void> {
		const server = serversStore.enabled.find((candidate) => candidate.id === serverId);

		// a remote server without a tunnel has nothing to answer; keep what is
		// already known rather than reporting a transport failure as a server one
		if (!server || (isRemoteServer(server) && !remoteAccessStore.isConnected(serverId))) return;

		await this.fetch(server);
	}

	/** Forget a server's list and ask for it again, tunnel included. */
	async reload(serverId: string): Promise<void> {
		this.clear(serverId);
		await this.connectAndLoad(serverId);
	}

	private async fetch(server: Server): Promise<void> {
		const result = await ServersService.listModels(server);

		this.states[server.id] = {
			drafts: result.raw ? ModelsService.sidecarFilesByRepo(result.raw) : undefined,
			error: result.error ?? null,
			loaded: result.ok,
			loading: false,
			models: result.models,
			raw: result.raw
		};
	}
}

export const serversModelsStore = new ServersModelsStore();
