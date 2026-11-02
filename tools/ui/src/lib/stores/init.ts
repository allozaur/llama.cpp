// direct imports, not via the barrel, to avoid circular deps
import { conversationsStore } from './conversations/index.svelte';
import { groupsStore } from './groups.svelte';
import { modelsStore } from './models/index.svelte';
import { permissionsStore } from './permissions.svelte';
import { projectsStore } from './projects.svelte';
import { promptsStore } from './prompts.svelte';
import { remoteAccessStore } from './remote-access.svelte';
import { serverStore } from './server.svelte';
import { serversStore } from './servers.svelte';
import { serversModelsStore } from './serversModels.svelte';
import { settingsStore } from './settings/index.svelte';
import { tabsStore } from './tabs.svelte';
import { toolsStore } from './tools.svelte';
import { versionStore } from './version.svelte';
import { browser } from '$app/environment';
import { MigrationService } from '$lib/services/migration.service';
import { StorageModeService } from '$lib/services/storage-mode.service';
import type { StorageAdapterDefinition } from '$lib/types';
import { validateApiKey } from '$lib/utils/api-key-validation';
import { isRemoteServer } from '$lib/utils/server';
import { toast } from 'svelte-sonner';

let activeTunnel: Promise<void> | null = null;
/** Storage adapter chosen in this browser that could not be reached at startup */
let storageFallback: StorageAdapterDefinition | null = null;
let hydration: Promise<void> | null = null;
let startup: Promise<void> | null = null;

/** Ask the browser not to evict conversations and settings under storage pressure, best effort. */
async function requestPersistentStorage(): Promise<void> {
	try {
		if (!navigator.storage?.persist || (await navigator.storage.persisted())) return;

		await navigator.storage.persist();
	} catch {
		// unsupported or denied, storage stays best-effort
	}
}

/**
 * Open the tunnel of the server the app opens with, when it is a remote one.
 *
 * Deliberately not awaited: the app paints with the server card reading
 * Connecting, and its models arrive when the handshake lands. Servers that are
 * merely enabled are left for the moment one of their models is picked.
 *
 * Runs once per session: startup asks twice - once before the local server is
 * known to exist, once after - and the second ask is the same tunnel.
 */
function connectActiveServer(): void {
	const active = serversStore.active;

	if (activeTunnel || !isRemoteServer(active)) return;

	activeTunnel = remoteAccessStore
		.connect(active.id)
		// the closed tunnel is exactly why the startup prefetch skipped this
		// server, so both lists are asked for once it is open
		.then(async () => {
			await serversModelsStore.refresh(active.id);
			await modelsStore.switchServer();
		})
		.catch(() => {
			// the server card carries the failure and offers a retry
		});
}

/**
 * Read the stored state the first request needs: migrations, the settings that
 * carry the API key, and the server that request goes to.
 *
 * Separate from {@link initStores} so a `load` can await it. The requests
 * `initStores` starts belong after a load, where plain `window.fetch` is the
 * intended one and SvelteKit raises no warning.
 */
export function hydrateStores(): Promise<void> {
	if (!browser) return Promise.resolve();

	hydration ??= (async () => {
		await MigrationService.runAllMigrations();

		// before anything reads conversations or settings, which may live in a storage adapter
		const chosen = StorageModeService.chosenAdapter;
		const active = await StorageModeService.activate(() => toast.error('Failed to save settings'));

		if (active) {
			// these read user data while being constructed, before the mode was known
			modelsStore.reloadPersisted();
			conversationsStore.preferences.resetPending();
		} else {
			storageFallback = chosen;
		}

		settingsStore.initialize();

		// the tunnel transport goes in before anything can ask for a model list: a
		// request aimed at a server's tunnel origin must never reach the server
		// that happens to serve this UI
		remoteAccessStore.installInterceptor();

		serversStore.initialize();

		connectActiveServer();
	})();

	return hydration;
}

export function initStores(): Promise<void> {
	if (!browser) return Promise.resolve();

	startup ??= (async () => {
		await hydrateStores();

		void requestPersistentStorage();

		// prefetch every server's model list in the background; failures are
		// per-server and never block startup
		void serversModelsStore.loadAll().then(() => modelsStore.warmHubDetails());

		if (storageFallback) {
			toast.warning(`${storageFallback.name} storage is unavailable, using this browser's storage`);
		}

		permissionsStore.initialize();
		toolsStore.initialize();

		// the local server state backs the installation facts and decides whether
		// /tools exists at all, so probe it first and only then list the tools;
		// otherwise they stay empty until the tools menu is opened
		void serverStore.prefetchLocalState().then(() => {
			// a build served without a local server has no local server to fall
			// back on, so the active server is only settled once that is known
			connectActiveServer();

			void toolsStore.fetchServerTools();
		});
		void versionStore.initialize();
		void groupsStore.initialize();
		void projectsStore.initialize();
		void promptsStore.initialize();

		// the full conversation list loads in the background; once it is back,
		// prune persisted tabs against the conversations that still exist
		void conversationsStore.initialize().then(() => {
			tabsStore.init(conversationsStore.conversations.map((c) => c.id));
		});
	})();

	return startup;
}

/** Load shared by the app's pages: read the stored state, then check the API key. */
export async function loadAppRoute(fetch: typeof globalThis.fetch): Promise<void> {
	// loads run before the root layout script, so the stored API key reaches
	// the probe only once the settings store has read localStorage; the rest of
	// the startup belongs to the layout, after this load
	await hydrateStores();
	await validateApiKey(fetch);
}
