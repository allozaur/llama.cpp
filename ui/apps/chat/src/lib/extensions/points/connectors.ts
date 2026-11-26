import type { Component } from 'svelte';

/**
 * An account or service the app is connected to, as Settings > Connectors lists it: one
 * sign-in, and everything the extension does with it.
 */
export interface Connector {
	/** Draws the connector: what it adds, whether it is connected, and its account. */
	card: Component<Record<string, never>>;
	/** Stable identity among the connectors. */
	id: string;
}

/**
 * A connector's sign-in, lent to the servers of its service (e.g. an MCP server): the one
 * account then covers them, and they ask for no sign-in of their own.
 */
export interface ServerAuth {
	/** Who is signed in, read reactively; a change connects the servers it covers again. */
	account(): string | null;
	/** Whether the sign-in is the one for this server right now, read reactively. */
	covers(serverUrl: string): boolean;
	/** Headers for a request to a server it covers, asked on every request so a renewed token is used. */
	headers(serverUrl: string): Promise<Record<string, string> | null>;
}
