/**
 * Backend availability for connection error states.
 *
 * The server error banner and the offline affordances should only appear when
 * no backend can serve requests. The active backend failing is not enough:
 * with an external backend configured, the UI stays usable.
 */

import { backendsModelsStore, backendsStore, remoteAccessStore, serverStore } from '$lib/stores';
import { isLocalBackend, isRemoteBackend } from '$lib/utils/backend';

export interface BackendAvailability {
	readonly hasAvailableBackend: boolean;
	readonly isOffline: boolean;
}

export function useBackendAvailability(): BackendAvailability {
	const hasAvailableBackend = $derived.by(() => {
		// no connection error at all: nothing to report
		if (!serverStore.error) return true;

		// the local server failed, but another provider may still be usable; a
		// remote one is only usable while its tunnel is open
		return backendsStore.enabled.some(
			(backend) =>
				!isLocalBackend(backend) &&
				backendsModelsStore.get(backend.id).error === null &&
				(!isRemoteBackend(backend) || remoteAccessStore.isConnected(backend.id))
		);
	});

	return {
		get hasAvailableBackend() {
			return hasAvailableBackend;
		},

		get isOffline() {
			return !hasAvailableBackend;
		}
	};
}
