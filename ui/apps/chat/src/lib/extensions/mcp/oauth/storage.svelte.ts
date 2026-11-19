/**
 * Where the browser keeps each MCP server's OAuth state: the client it
 * registered, its tokens, the discovery it made and, while a sign-in is under
 * way, the PKCE verifier and the `state` that ties the callback to it.
 *
 * One localStorage entry, apart from the settings: tokens never travel with a
 * settings export. A record belongs to one server URL and one redirect URL;
 * when either changes, the record no longer applies.
 */

import type {
	OAuthDiscoveryState,
	StoredOAuthClientInformation,
	StoredOAuthTokens
} from '@modelcontextprotocol/client';
import { STORAGE_APP_NAME } from '#lib/constants/index.ts';

export const MCP_OAUTH_LOCALSTORAGE_KEY = `${STORAGE_APP_NAME}.mcpOAuth`;

/** How a sign-in that left for the authorization page comes back. */
export enum McpOAuthFlowMode {
	/** In a popup, which closes itself once the tokens are in. */
	POPUP = 'popup',
	/** In this tab, which goes back to where it was. */
	REDIRECT = 'redirect'
}

/** A sign-in waiting for its callback. */
export interface McpOAuthPendingFlow {
	codeVerifier?: string;
	mode: McpOAuthFlowMode;
	/** Where a redirect sign-in returns to. */
	returnUrl: string;
	startedAt: number;
	state: string;
	useProxy: boolean;
}

export interface McpOAuthRecord {
	clientInformation?: StoredOAuthClientInformation;
	discoveryState?: OAuthDiscoveryState;
	pending?: McpOAuthPendingFlow;
	redirectUrl: string;
	serverUrl: string;
	tokens?: StoredOAuthTokens;
}

type McpOAuthRecords = Record<string, McpOAuthRecord>;

// bumped on every write here and in other tabs, so what reads a record stays current
let version = $state(0);

function readAll(): McpOAuthRecords {
	if (typeof localStorage === 'undefined') return {};

	try {
		const raw = localStorage.getItem(MCP_OAUTH_LOCALSTORAGE_KEY);
		const parsed: unknown = raw ? JSON.parse(raw) : null;

		return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
			? (parsed as McpOAuthRecords)
			: {};
	} catch (error) {
		console.warn('[MCP OAuth] Failed to read the stored OAuth state:', error);

		return {};
	}
}

function writeAll(records: McpOAuthRecords): void {
	if (typeof localStorage === 'undefined') return;

	try {
		localStorage.setItem(MCP_OAUTH_LOCALSTORAGE_KEY, JSON.stringify(records));
	} catch (error) {
		console.warn('[MCP OAuth] Failed to store the OAuth state:', error);
	}

	version++;
}

export const mcpOAuthStorage = {
	/** All records, by server id. Reactive. */
	all(): McpOAuthRecords {
		void version;

		return readAll();
	},

	/** The server whose sign-in is waiting for this `state`. */
	findByState(state: string): { record: McpOAuthRecord; serverId: string } | undefined {
		for (const [serverId, record] of Object.entries(readAll())) {
			if (record.pending?.state === state) return { record, serverId };
		}

		return undefined;
	},

	/** The record of a server, or undefined when there is none for this URL and redirect URL. */
	get(serverId: string, serverUrl: string, redirectUrl: string): McpOAuthRecord | undefined {
		void version;

		const record = readAll()[serverId];

		if (!record || record.serverUrl !== serverUrl || record.redirectUrl !== redirectUrl) {
			return undefined;
		}

		return record;
	},

	/** Re-read the stored state, for a change another tab made. */
	invalidate(): void {
		version++;
	},

	remove(serverId: string): void {
		const records = readAll();

		if (!(serverId in records)) return;

		delete records[serverId];
		writeAll(records);
	},

	/** Change a server's record; one for another URL or redirect URL starts over. */
	update(
		serverId: string,
		serverUrl: string,
		redirectUrl: string,
		change: (record: McpOAuthRecord) => McpOAuthRecord
	): void {
		const records = readAll();
		const current = records[serverId];
		const base =
			current && current.serverUrl === serverUrl && current.redirectUrl === redirectUrl
				? current
				: { redirectUrl, serverUrl };

		records[serverId] = change(base);
		writeAll(records);
	}
};
