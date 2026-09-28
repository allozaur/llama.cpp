// direct imports, not via the barrel, to avoid circular deps
import { backendsStore } from './backends.svelte';
import { backendsModelsStore } from './backendsModels.svelte';
import { conversationsStore } from './conversations/index.svelte';
import { groupsStore } from './groups.svelte';
import { modelsStore } from './models/index.svelte';
import { permissionsStore } from './permissions.svelte';
import { projectsStore } from './projects.svelte';
import { serverStore } from './server.svelte';
import { settingsStore } from './settings/index.svelte';
import { tabsStore } from './tabs.svelte';
import { toolsStore } from './tools.svelte';
import { versionStore } from './version.svelte';
import { browser } from '$app/environment';
import { BUILT_IN_EXTENSIONS } from '$lib/extensions/builtin';
import { extensions } from '$lib/extensions/registry.svelte';
import { MigrationService } from '$lib/services/migration.service';
import { validateApiKey } from '$lib/utils/api-key-validation';

let hydration: Promise<void> | null = null;
let extensionsStarted: Promise<void> | null = null;
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
 * Read the stored state the first request needs: migrations, the settings that
 * carry the API key, and the backend that request goes to.
 *
 * Separate from {@link initStores} so a `load` can await it. The requests
 * `initStores` starts belong after a load, where plain `window.fetch` is the
 * intended one and SvelteKit raises no warning.
 */
export function hydrateStores(): Promise<void> {
	if (!browser) return Promise.resolve();

	hydration ??= (async () => {
		await MigrationService.runAllMigrations();

		settingsStore.initialize();
		backendsStore.initialize();
	})();

	return hydration;
}

/**
 * Register the built-in extensions and activate the ones that are switched
 * on, once. The startup does it; the load of an extension's page does too,
 * as it runs before the startup and needs the page to be there.
 */
export function startExtensions(): Promise<void> {
	if (!browser) return Promise.resolve();

	extensionsStarted ??= (async () => {
		// extensions start once the settings they read are in place
		await hydrateStores();

		for (const manifest of BUILT_IN_EXTENSIONS) extensions.register(manifest);

		await extensions.activateEnabled();
	})();

	return extensionsStarted;
}

export function initStores(): Promise<void> {
	if (!browser) return Promise.resolve();

	startup ??= (async () => {
		await hydrateStores();

		void requestPersistentStorage();

		// prefetch every backend's model list in the background; failures are
		// per-backend and never block startup
		void backendsModelsStore.loadAll().then(() => modelsStore.warmHubDetails());

		permissionsStore.initialize();
		toolsStore.initialize();

		// the local server state backs the installation facts and decides whether
		// /tools exists at all, so probe it first and only then list the tools;
		// otherwise they stay empty until the tools menu is opened
		void serverStore.prefetchLocalState().then(() => toolsStore.fetchServerTools());

		await startExtensions();

		void versionStore.initialize();
		void groupsStore.initialize();
		void projectsStore.initialize();

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
