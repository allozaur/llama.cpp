/**
 * backendsModelsStore - Per-backend model catalog cache.
 *
 * Prefetches every enabled backend's model list, so switching backends is
 * instant and the switcher can show load state. The active backend's list
 * still lives in modelsStore, which owns selection and chat wiring; this
 * cache is the prefetch layer the switches start from.
 *
 * Remote backends are listed through their tunnel, so the prefetch skips one
 * until its tunnel is open: a handshake per provider is what `connectAndLoad`
 * is for, never the startup sweep.
 */

import { BackendsService } from '$lib/services/backends.service';
import { ModelsService } from '$lib/services/models.service';
import { backendsStore } from '$lib/stores/backends.svelte';
import { remoteAccessStore } from '$lib/stores/remote-access.svelte';
import type { Backend } from '$lib/types';
import type { ApiModelsListResponse } from '$lib/types';
import type { ModelSidecarFile } from '$lib/types/models';
import type { ModelOption } from '$lib/types/models';
import { isRemoteBackend } from '$lib/utils/backend';

export interface BackendModelsState {
	/** Draft sidecars the listing carries, keyed by the repo they belong to. */
	drafts?: Record<string, ModelSidecarFile[]>;
	error: string | null;
	loaded: boolean;
	loading: boolean;
	models: ModelOption[];
	/** Untouched list payload, kept for the local backend so its router rows survive a tab switch. */
	raw?: ApiModelsListResponse;
}

const EMPTY_STATE: BackendModelsState = {
	error: null,
	loaded: false,
	loading: false,
	models: []
};

class BackendsModelsStore {
	private states = $state<Record<string, BackendModelsState>>({});

	clear(backendId: string): void {
		delete this.states[backendId];
	}

	/**
	 * Open a remote provider's tunnel and list it.
	 *
	 * The card's Connect action and the provider switch both want this; startup
	 * prefetch does not, since a handshake per provider on first paint is not what
	 * a list of providers asked for.
	 */
	async connectAndLoad(backendId: string): Promise<void> {
		await this.ensureLoaded(backendId, { connect: true });
	}

	/**
	 * Load a backend's models once.
	 *
	 * @param connect - Open the tunnel of a remote provider when it has none. Off
	 * by default: the startup prefetch must not handshake with every provider.
	 */
	async ensureLoaded(backendId: string, options?: { connect?: boolean }): Promise<void> {
		const backend = backendsStore.enabled.find((candidate) => candidate.id === backendId);

		if (!backend) return;

		const state = this.states[backendId];

		if (state?.loaded || state?.loading) return;

		if (isRemoteBackend(backend) && !remoteAccessStore.isConnected(backendId)) {
			if (!options?.connect) return;

			this.states[backendId] = { error: null, loaded: false, loading: true, models: [] };

			try {
				await remoteAccessStore.connect(backendId);
			} catch (error: unknown) {
				this.states[backendId] = {
					error: error instanceof Error ? error.message : String(error),
					loaded: false,
					loading: false,
					models: []
				};

				return;
			}
		}

		this.states[backendId] = { error: null, loaded: false, loading: true, models: [] };
		await this.fetch(backend);
	}

	get(backendId: string): BackendModelsState {
		return this.states[backendId] ?? EMPTY_STATE;
	}

	/** Prefetch every enabled backend's model list. */
	async loadAll(): Promise<void> {
		const enabled = backendsStore.enabled;
		const ids = new Set(enabled.map((backend) => backend.id));

		for (const id of Object.keys(this.states)) {
			if (!ids.has(id)) {
				delete this.states[id];
			}
		}

		await Promise.all(enabled.map((backend) => this.ensureLoaded(backend.id)));
	}

	/**
	 * Ask a backend for its list again, keeping what is already known. Used while
	 * a remote load settles, since its status never reaches the local feed.
	 */
	async refresh(backendId: string): Promise<void> {
		const backend = backendsStore.enabled.find((candidate) => candidate.id === backendId);

		// a remote provider without a tunnel has nothing to answer; keep what is
		// already known rather than reporting a transport failure as a server one
		if (!backend || (isRemoteBackend(backend) && !remoteAccessStore.isConnected(backendId))) return;

		await this.fetch(backend);
	}

	/** Forget a provider's list and ask for it again, tunnel included. */
	async reload(backendId: string): Promise<void> {
		this.clear(backendId);
		await this.connectAndLoad(backendId);
	}

	private async fetch(backend: Backend): Promise<void> {
		const result = await BackendsService.listModels(backend);

		this.states[backend.id] = {
			drafts: result.raw ? ModelsService.sidecarFilesByRepo(result.raw) : undefined,
			error: result.error ?? null,
			loaded: result.ok,
			loading: false,
			models: result.models,
			raw: result.raw
		};
	}
}

export const backendsModelsStore = new BackendsModelsStore();
