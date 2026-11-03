/**
 * API base resolution for servers.
 *
 * The UI can talk to more than one server endpoint. Services build request
 * URLs through {@link apiUrl} so a request always targets the right server.
 * The servers store registers a resolver here; this module never imports the
 * store, which keeps URL resolution free of store dependencies.
 */

import { isLocalServer, serverChatUrl, serverModelsUrl, serverOrigin } from './server';
import { base } from '$app/paths';
import { API_ABSOLUTE_URL_PROTOCOLS, API_CHAT, API_MODELS } from '$lib/constants';
import type { Server } from '$lib/types';

/** Server list and active selection as exposed to URL resolution. */
export interface ServersSnapshot {
	activeId: string;
	servers: Server[];
}

type ServersResolver = () => ServersSnapshot;

let resolveServers: ServersResolver | null = null;

/** Registered once by the servers store. */
export function setServersResolver(resolver: ServersResolver | null): void {
	resolveServers = resolver;
}

/**
 * Look up a server by id, defaulting to the active one.
 */
export function getServer(serverId?: string): Server | undefined {
	const snapshot = resolveServers?.();

	if (!snapshot) return undefined;

	const id = serverId ?? snapshot.activeId;

	return snapshot.servers.find((server) => server.id === id);
}

/** Every registered server, in list order. */
export function getServers(): Server[] {
	return resolveServers?.().servers ?? [];
}

/**
 * API root for a server: its own base URL, the synthetic tunnel origin of a
 * remote server, or an empty string for the local one.
 */
export function getServerBaseUrl(serverId?: string): string {
	const server = getServer(serverId);

	return server ? serverOrigin(server) : '';
}

/**
 * Request target for a server's chat completions endpoint. Returns a relative
 * path for the local server and an absolute URL for every other one — its own
 * base URL, or the tunnel origin of a remote server — so callers can hand the
 * result straight to `fetch` (or to `apiFetch`, which resolves relative paths
 * against the base).
 */
export function apiChatUrl(serverId?: string): string {
	const server = getServer(serverId);

	if (server && !isLocalServer(server)) {
		return serverChatUrl(server);
	}

	return apiUrl(API_CHAT.COMPLETIONS, serverId);
}

/**
 * Request target for a server's models listing. Returns a plain path for the
 * local server (so `apiFetch` applies the base) and an absolute URL otherwise.
 */
export function apiModelsUrl(serverId?: string): string {
	const server = getServer(serverId);

	if (server && !isLocalServer(server)) {
		return serverModelsUrl(server);
	}

	return API_MODELS.LIST;
}

/**
 * Absolute URL for an API path on a server.
 *
 * Absolute URLs pass through untouched. Paths on the local server keep the
 * existing base-path-relative form, so serving under a subpath still works.
 * Paths on external servers resolve against the server's API root.
 */
export function apiUrl(path: string, serverId?: string): string {
	if (API_ABSOLUTE_URL_PROTOCOLS.some((protocol) => path.startsWith(protocol))) {
		return path;
	}

	const baseUrl = getServerBaseUrl(serverId);

	if (!baseUrl) {
		return `${base}${path}`;
	}

	const root = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;

	return new URL(path.replace(/^\.?\//, ''), root).toString();
}
