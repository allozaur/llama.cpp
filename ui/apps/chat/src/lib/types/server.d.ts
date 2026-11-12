import type { ServerKind } from '$lib/enums';

/**
 * A llama.cpp server the UI talks to: the one serving this app, one the user
 * pointed at by URL, or one reached over a WebRTC tunnel by its access code.
 * All of them speak the llama.cpp API, so nothing is negotiated at runtime.
 */
export interface Server {
	/** Sent as `Authorization: Bearer <apiKey>` when set. */
	apiKey?: string;
	/** Endpoint origin, no trailing slash; empty for the built-in and remote servers. */
	baseUrl: string;
	/** Remote servers only: 40-character access code of the `llama-server --connect` host. */
	code?: string;
	enabled: boolean;
	/** Extra request headers sent verbatim, e.g. an authenticating proxy. */
	headers?: Record<string, string>;
	id: string;
	/** How the server is reached; absent in stored data means `url`. */
	kind: ServerKind;
	modelCount?: number;
	name: string;
}
