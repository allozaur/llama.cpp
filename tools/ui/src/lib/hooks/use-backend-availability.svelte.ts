/**
 * Backend availability for connection error states.
 *
 * The server error banner and the offline affordances should only appear when
 * nothing can serve requests. The local server failing is not enough: with an
 * external server configured, the UI stays usable.
 */

import { remoteAccessStore, serversModelsStore, serversStore, serverStore } from '$lib/stores';
import { isLocalServer, isRemoteServer } from '$lib/utils/server';

export interface BackendAvailability {
	readonly hasAvailableBackend: boolean;
	readonly isOffline: boolean;
}

export function useBackendAvailability(): BackendAvailability {
	const hasAvailableBackend = $derived.by(() => {
		// no connection error at all: nothing to report
		if (!serverStore.error) return true;

		// the local server failed, but another server may still be usable; a
		// remote one is only usable while its tunnel is open
		return serversStore.enabled.some(
			(server) =>
				!isLocalServer(server) &&
				serversModelsStore.get(server.id).error === null &&
				(!isRemoteServer(server) || remoteAccessStore.isConnected(server.id))
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
