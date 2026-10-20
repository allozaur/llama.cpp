import { error } from '@sveltejs/kit';
import { browser } from '$app/environment';
import { HEADERS, LOCAL_BACKEND_ID } from '$lib/constants';
import { MimeTypeApplication } from '$lib/enums';
import { settingsStore } from '$lib/stores/settings/index.svelte';
import { apiUrl } from '$lib/utils/api-base';

/**
 * Validates the stored API key against the server serving this UI.
 *
 * Pinned to the built-in server, the way the model status feed is: with a
 * remote server active, probing *that* server with this key would raise the
 * API key splash over a credential that belongs to a different machine. The
 * servers a user added carry their own key, and their failures surface on
 * their own card instead.
 *
 * Throws SvelteKit errors for authentication failures or server issues.
 */
export async function validateApiKey(fetch: typeof globalThis.fetch): Promise<void> {
	if (!browser) {
		return;
	}

	const headers: Record<string, string> = { [HEADERS.CONTENT_TYPE]: MimeTypeApplication.JSON };
	// Probe /props even without a stored key: on a server started with --api-key
	// the unauthenticated request returns 401 and surfaces the API key splash,
	// which is the onboarding path for entering the key.
	const apiKey = settingsStore.config.apiKey?.toString().trim();

	if (apiKey) headers[HEADERS.AUTHORIZATION] = `${HEADERS.BEARER}${apiKey}`;

	try {
		const response = await fetch(apiUrl('/props', LOCAL_BACKEND_ID), { headers });

		if (!response.ok) {
			if (response.status === 401 || response.status === 403) {
				throw error(401, 'Access denied');
			}

			console.warn(`Server responded with status ${response.status} during API key validation`);

			return;
		}
	} catch (err) {
		// a SvelteKit error already carries its status; anything else is the local
		// server being unreachable, which the server cards report instead
		if (err && typeof err === 'object' && 'status' in err) throw err;

		console.warn('Cannot connect to server for API key validation:', err);
	}
}
