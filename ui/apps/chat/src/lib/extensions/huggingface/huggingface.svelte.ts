/**
 * The state of the Hugging Face extension: its account, the share in progress, and the
 * Hugging Face MCP server the account signs in.
 *
 * The account, the sign-in and the sharing live in @ggml-org/llama-huggingface. This folder is
 * the part that knows Llama Chat: who the app is, what a conversation is and where the
 * components show. The core reaches none of it directly: index.ts contributes it through the
 * extension points.
 */

import {
	HUGGING_FACE_CLIENT_NAME,
	HUGGING_FACE_DEFAULT_DATASET_NAME,
	HUGGING_FACE_LOGO_URL,
	HUGGING_FACE_MCP_SERVER_ID,
	HUGGING_FACE_REQUIRED_SCOPE,
	HUGGING_FACE_SCOPES
} from './constants';
import { HfAccount } from '@ggml-org/llama-huggingface/svelte';
import { RECOMMENDED_MCP_SERVERS } from '#lib/constants/recommended-mcp-servers.constants.ts';
import { SETTINGS_KEYS } from '#lib/constants/settings-keys.constants.ts';
import { STORAGE_APP_NAME } from '#lib/constants/storage.constants.ts';
// direct imports between stores, not via the barrel, to avoid circular deps
import { settingsStore } from '#lib/stores/settings/index.svelte.ts';
import type { MCPServerSettingsEntry } from '#lib/types/index.ts';
import { withBase } from '#lib/utils/base-path.ts';
import { parseMcpServerSettings } from '#lib/utils/mcp.ts';
import { canonicalizeServerUrl } from '#lib/utils/url.ts';
import { uuid } from '#lib/utils/uuid.ts';

/** The account every Hugging Face component of the app shows. */
export const huggingFace = new HfAccount({
	callbackUrl: () => `${window.location.origin}${withBase('/')}`,
	clientName: HUGGING_FACE_CLIENT_NAME,
	defaultDatasetName: HUGGING_FACE_DEFAULT_DATASET_NAME,
	logoUrl: HUGGING_FACE_LOGO_URL,
	requiredScope: HUGGING_FACE_REQUIRED_SCOPE,
	scopes: HUGGING_FACE_SCOPES,
	storagePrefix: STORAGE_APP_NAME
});

/** What a share was started from: a conversation, and the message its trace can end at. */
export interface ConversationShareRequest {
	conversationId: string;
	messageId?: string;
}

class ConversationShare {
	/** The share the dialog is open for, `null` while it is closed. */
	request = $state<ConversationShareRequest | null>(null);

	close(): void {
		this.request = null;
	}

	open(request: ConversationShareRequest): void {
		this.request = request;
	}
}

export const conversationShare = new ConversationShare();

/** The Hugging Face MCP server, as the app recommends it. */
const mcpServer = RECOMMENDED_MCP_SERVERS.find(
	(server) => server.id === HUGGING_FACE_MCP_SERVER_ID
);
const mcpServerUrl = mcpServer ? canonicalizeServerUrl(mcpServer.url) : null;

export function isHuggingFaceMcpServer(url: string): boolean {
	return mcpServerUrl !== null && canonicalizeServerUrl(url) === mcpServerUrl;
}

/**
 * Hugging Face tools in chats: the Hugging Face MCP server among the user's MCP servers. The
 * server list is a setting of the app, so it is read and written here without reaching into
 * the MCP extension, which connects whatever the list holds.
 */
export const huggingFaceTools = {
	/** Whether the app knows the server at all. */
	isAvailable: mcpServer !== undefined,

	get isOn(): boolean {
		return this.server?.enabled === true;
	},

	/** The Hugging Face server among the user's MCP servers, once added. */
	get server(): MCPServerSettingsEntry | undefined {
		return this.servers.find((server) => isHuggingFaceMcpServer(server.url));
	},

	/** The user's MCP servers, as the setting holds them. */
	get servers(): MCPServerSettingsEntry[] {
		return parseMcpServerSettings(settingsStore.config[SETTINGS_KEYS.MCP_SERVERS]);
	},

	/** Adds the server on first use; turning it off keeps it among the MCP servers. */
	setOn(isOn: boolean): void {
		if (!mcpServer) return;

		const existing = this.server;
		const servers = existing
			? this.servers.map((server) =>
					server.id === existing.id ? { ...server, enabled: isOn } : server
				)
			: [...this.servers, { enabled: isOn, id: uuid(), name: mcpServer.name, url: mcpServer.url }];

		settingsStore.updateConfig(SETTINGS_KEYS.MCP_SERVERS, JSON.stringify(servers));
	}
};
