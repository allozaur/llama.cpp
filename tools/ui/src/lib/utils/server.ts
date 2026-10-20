/**
 * Server list parsing, defaults and endpoint URLs.
 *
 * External servers are persisted in settings as a JSON list. Malformed
 * entries are dropped instead of throwing so a corrupted settings value can
 * never break URL resolution.
 *
 * A remote server has no URL of its own: it is reached through a WebRTC
 * tunnel and addressed by a synthetic origin that carries its id
 * (`tunnelOrigin`). The host suffix is reserved, so the address can never be
 * mistaken for a real server, and a request that escapes the tunnel transport
 * fails in the browser instead of reaching the server serving this UI.
 */

import {
	CODE_CHARS,
	CODE_LENGTHS,
	DEFAULT_SERVER_CHAT_PATH,
	DEFAULT_SERVER_MODELS_PATH,
	FAVICON_SERVICE_URL,
	LOCAL_BACKEND_ID,
	SERVER_ID_PREFIX,
	TUNNEL_HOST_SUFFIX
} from '$lib/constants';
import { ServerKind } from '$lib/enums';
import type { Server } from '$lib/types';

/** Icon size requested from the favicon service, shown at 16px. */
const FAVICON_SIZE = 64;
/** Longest host label a server id can be shortened to (DNS label limit). */
const HOST_LABEL_MAX = 63;

/** Absolute chat completions URL for a server. */
export function serverChatUrl(server: Server): string {
	return joinServerUrl(serverOrigin(server), DEFAULT_SERVER_CHAT_PATH);
}

/** Absolute models listing URL for a server. */
export function serverModelsUrl(server: Server): string {
	return joinServerUrl(serverOrigin(server), DEFAULT_SERVER_MODELS_PATH);
}

/**
 * Origin a server's requests are addressed at: its own base URL, or the
 * synthetic tunnel origin of a remote server. Empty for the built-in
 * server, whose requests stay on the origin serving this UI.
 */
export function serverOrigin(server: Server): string {
	if (isRemoteServer(server)) return tunnelOrigin(server.id);

	return server.baseUrl.trim().replace(/\/+$/, '');
}

/**
 * Favicon of a server's root domain, used when no bundled mark matches. Hosts
 * rarely serve a favicon themselves, so the subdomain is dropped
 * (`api.z.ai` -> `z.ai`) and the icon is requested through a favicon service.
 * Returns null when the URL carries no usable host, which is always the case
 * for a remote server: a tunnel serves no favicon.
 */
export function serverFaviconUrl(baseUrl: string): string | null {
	if (isTunnelHost(hostOf(baseUrl))) return null;

	try {
		const labels = new URL(baseUrl).hostname.split('.');
		const root = labels.length > 2 ? labels.slice(-2).join('.') : labels.join('.');

		return root ? `${FAVICON_SERVICE_URL}${root}&sz=${FAVICON_SIZE}` : null;
	} catch {
		return null;
	}
}

/**
 * The access code of a remote server, trimmed of the spacing a user tends to
 * paste with. Empty when the value is not a usable code.
 */
export function codeOf(server?: Server | null): string {
	return normalizeShareCode(server?.code ?? '');
}

/** The built-in server pointing at the server that serves this UI. */
export function createLocalServer(apiKey?: string, enabled = true): Server {
	return {
		apiKey,
		baseUrl: '',
		enabled,
		id: LOCAL_BACKEND_ID,
		kind: ServerKind.LOCAL,
		name: 'Local'
	};
}

/** A remote llama.cpp server, reached through the tunnel of its access code. */
export function createRemoteServer(code: string, id: string, name?: string): Server {
	return {
		baseUrl: '',
		code: normalizeShareCode(code),
		enabled: true,
		id,
		kind: ServerKind.REMOTE,
		name: name?.trim() || 'Remote server'
	};
}

/** A llama.cpp server answering on its own base URL. */
export function createUrlServer(
	baseUrl: string,
	id: string,
	name?: string,
	apiKey?: string,
	headers?: Record<string, string>
): Server {
	return {
		apiKey,
		baseUrl: baseUrl.trim().replace(/\/+$/, ''),
		enabled: true,
		headers: headers && Object.keys(headers).length > 0 ? headers : undefined,
		id,
		kind: ServerKind.URL,
		name: name?.trim() || hostOf(baseUrl) || baseUrl.trim()
	};
}

/** Whether the built-in server is the one serving this UI. */
export function isLocalServer(server?: Server | null): boolean {
	return !server || server.kind === ServerKind.LOCAL;
}

/** Whether a server is reached through a WebRTC tunnel. */
export function isRemoteServer(server?: Server | null): boolean {
	return server?.kind === ServerKind.REMOTE;
}

/**
 * Whether a server can be reached at all: the built-in one always, a remote
 * one with a valid access code, and a URL one with a URL that parses and does
 * not squat on the tunnel host suffix.
 */
export function isReachableServer(server: Server): boolean {
	if (isLocalServer(server)) return true;

	if (isRemoteServer(server)) return Boolean(codeOf(server));

	const baseUrl = server.baseUrl.trim();

	if (!baseUrl || isTunnelHost(hostOf(baseUrl))) return false;

	return isHttpUrl(baseUrl);
}

/** Host of a URL, empty when it does not parse. */
export function hostOf(url: string): string {
	try {
		return new URL(url).hostname;
	} catch {
		return '';
	}
}

/** Whether a value parses as an http(s) URL. */
export function isHttpUrl(value: string): boolean {
	try {
		const { protocol } = new URL(value);

		return protocol === 'http:' || protocol === 'https:';
	} catch {
		return false;
	}
}

/**
 * Strip the spacing from a pasted access code and check it against the alphabet
 * llama-server generates its code from. Empty when the value is not a code.
 */
export function normalizeShareCode(code: string): string {
	const code_ = code.replace(/\s/g, '');

	if (code_.length !== CODE_LENGTHS.SHARE) return '';

	for (const char of code_) {
		if (!CODE_CHARS.includes(char)) return '';
	}

	return code_;
}

/**
 * Host label a server's tunnel origin carries. Exported so a host coming back
 * from the transport can be matched against a server without un-sanitizing it.
 */
export function tunnelHostLabel(serverId: string): string {
	return hostLabel(serverId);
}

/**
 * Host label of a tunnel origin, or null when the request is not addressed at
 * one. The label is a server id in its hostname-safe form, which is how
 * `tunnelOrigin` wrote it.
 */
export function parseTunnelOrigin(url: RequestInfo | URL): string | null {
	const href = url instanceof URL ? url.href : typeof url === 'string' ? url : url.url;
	const host = hostOf(href);

	if (!isTunnelHost(host)) return null;

	return host.slice(0, host.length - TUNNEL_HOST_SUFFIX.length - 1);
}

function joinServerUrl(origin: string, path: string): string {
	const suffix = path.startsWith('/') ? path : `/${path}`;

	return `${origin}${suffix}`;
}

/** Hostname-safe form of a server id; both sides of the comparison use it. */
function hostLabel(serverId: string): string {
	return (
		serverId
			.trim()
			.toLowerCase()
			.replace(/[^a-z0-9-]/g, '-')
			.replace(/^-+|-+$/g, '')
			.slice(0, HOST_LABEL_MAX) || 'server'
	);
}

function isTunnelHost(host: string): boolean {
	return host === TUNNEL_HOST_SUFFIX || host.endsWith(`.${TUNNEL_HOST_SUFFIX}`);
}

function parseServerEntry(entry: unknown, index: number): Server | null {
	if (!entry || typeof entry !== 'object') return null;

	const raw = entry as Record<string, unknown>;
	const id =
		typeof raw.id === 'string' && raw.id.trim()
			? raw.id.trim()
			: `${SERVER_ID_PREFIX}-${index + 1}`;
	const name = typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim() : '';
	const enabled = raw.enabled !== false;
	const headers = parseServerHeaders(raw.headers);
	const code = typeof raw.code === 'string' ? normalizeShareCode(raw.code) : '';
	const baseUrl = typeof raw.baseUrl === 'string' ? raw.baseUrl.trim().replace(/\/+$/, '') : '';

	// a remote server is its code; without a usable one it is nothing
	if (raw.kind === ServerKind.REMOTE) {
		if (!code) return null;

		return {
			baseUrl: '',
			code,
			enabled,
			headers,
			id,
			kind: ServerKind.REMOTE,
			name: name || 'Remote server'
		};
	}

	// the local server is built in and never persisted
	if (!baseUrl || id === LOCAL_BACKEND_ID) return null;

	// a URL server must not squat on the host the tunnel transport routes
	if (isTunnelHost(hostOf(baseUrl)) || !isHttpUrl(baseUrl)) return null;

	return {
		baseUrl,
		enabled,
		headers,
		id,
		kind: ServerKind.URL,
		name: name || hostOf(baseUrl)
	};
}

function parseServerHeaders(raw: unknown): Record<string, string> | undefined {
	if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;

	const entries = Object.entries(raw as Record<string, unknown>)
		.filter(([, value]) => typeof value === 'string' && value.trim() !== '')
		.map(([key, value]) => [key.trim(), (value as string).trim()] as const);

	return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

/**
 * Parse the persisted servers JSON into server entries.
 */
export function parseServersSettings(rawServers: unknown): Server[] {
	if (!rawServers) return [];

	let parsed: unknown;

	if (typeof rawServers === 'string') {
		const trimmed = rawServers.trim();

		if (!trimmed) return [];

		try {
			parsed = JSON.parse(trimmed);
		} catch (error) {
			console.warn('[servers] Failed to parse servers JSON, ignoring value:', error);

			return [];
		}
	} else {
		parsed = rawServers;
	}

	if (!Array.isArray(parsed)) return [];

	return parsed.flatMap((entry, index) => {
		const server = parseServerEntry(entry, index);

		return server ? [server] : [];
	});
}

/**
 * Read a model's context size out of one `/v1/models` entry. A server leaves it
 * unknown when it has not loaded the model, and a model-mode listing reports the
 * trained size under `meta.n_ctx_train` instead.
 */
export function readModelContextLength(value: unknown): number | undefined {
	if (!value || typeof value !== 'object') return undefined;

	const entry = value as Record<string, unknown>;

	if (typeof entry.context_length === 'number' && entry.context_length > 0) {
		return entry.context_length;
	}

	const meta = entry.meta;

	if (meta && typeof meta === 'object') {
		const trained = (meta as Record<string, unknown>).n_ctx_train;

		if (typeof trained === 'number' && trained > 0) return trained;
	}

	return undefined;
}

/** Origin a remote server's requests are addressed at. */
export function tunnelOrigin(serverId: string): string {
	return `https://${hostLabel(serverId)}.${TUNNEL_HOST_SUFFIX}`;
}
