import { AttachmentType, ReasoningEffort, ToolSource } from '$lib/enums';
import type { ChatMessageTimings, ChatMessageType, ChatRole } from '$lib/types/chat';

/**
 * @deprecated Legacy per-conversation MCP server flags. MCP server enabled
 * state is global now; per-conversation tool policy lives in
 * `disabledTools` / `disabledToolCategories`. Read by the migration only.
 */
export interface McpServerOverride {
	serverId: string;
	enabled: boolean;
}

/** A reusable system message stored in the prompt library. */
export interface DatabasePrompt {
	id: string;
	name: string;
	content: string;
	/** Epoch ms of the last edit to the name, description or content. */
	lastModified: number;
	description?: string;
}

export interface DatabaseConversation {
	currNode: string | null;
	id: string;
	lastModified: number;
	name: string;
	/** @deprecated See {@link McpServerOverride}. Kept on rows for downgrade compatibility. */
	mcpServerOverrides?: McpServerOverride[];
	thinkingEnabled?: boolean;
	reasoningEffort?: ReasoningEffort;
	cwd?: string;
	/** Tool keys disabled for this conversation, incl. server-scoped MCP group keys (`mcp:<serverId>`) */
	disabledTools?: string[];
	/** Tool categories disabled for this conversation */
	disabledToolCategories?: ToolSource[];
	forkedFromConversationId?: string;
	/** Sidebar group the conversation is sorted into. */
	groupId?: string;
	/** Project this conversation belongs to, when started from one. */
	projectId?: string;
	pinned?: boolean;
}

export interface DatabaseMessageExtraAudioFile {
	type: AttachmentType.AUDIO;
	name: string;
	size?: number;
	base64Data: string;
	mimeType: string;
}

export interface DatabaseMessageExtraVideoFile {
	type: AttachmentType.VIDEO;
	name: string;
	size?: number;
	base64Data: string;
	mimeType: string;
}

export interface DatabaseMessageExtraImageFile {
	type: AttachmentType.IMAGE;
	name: string;
	size?: number;
	base64Url: string;
}

/**
 * Legacy format from the old UI — pasted content was stored as "context" type
 * @deprecated Use DatabaseMessageExtraTextFile instead
 */
export interface DatabaseMessageExtraLegacyContext {
	type: AttachmentType.LEGACY_CONTEXT;
	name: string;
	size?: number;
	content: string;
}

export interface DatabaseMessageExtraPdfFile {
	type: AttachmentType.PDF;
	base64Data: string;
	name: string;
	size?: number;
	content: string;
	images?: string[];
	processedAsImages: boolean;
}

export interface DatabaseMessageExtraTextFile {
	type: AttachmentType.TEXT;
	name: string;
	size?: number;
	content: string;
}

export interface DatabaseMessageExtraMcpPrompt {
	type: AttachmentType.MCP_PROMPT;
	name: string;
	size?: number;
	serverName: string;
	promptName: string;
	content: string;
	arguments?: Record<string, string>;
}

export interface DatabaseMessageExtraMcpResource {
	type: AttachmentType.MCP_RESOURCE;
	name: string;
	size?: number;
	uri: string;
	serverName: string;
	content: string;
	mimeType?: string;
}

/**
 * Links a system message to the prompt it was created from. `promptId` is a
 * library prompt id, or an MCP prompt id (`mcp:<server>:<name>`) for prompts
 * that come from an MCP server.
 */
export interface DatabaseMessageExtraPrompt {
	type: AttachmentType.PROMPT;
	promptId: string;
	title: string;
}

export type DatabaseMessageExtra =
	| DatabaseMessageExtraImageFile
	| DatabaseMessageExtraTextFile
	| DatabaseMessageExtraAudioFile
	| DatabaseMessageExtraVideoFile
	| DatabaseMessageExtraPdfFile
	| DatabaseMessageExtraMcpPrompt
	| DatabaseMessageExtraMcpResource
	| DatabaseMessageExtraPrompt
	| DatabaseMessageExtraLegacyContext;

export interface DatabaseMessage {
	id: string;
	convId: string;
	type: ChatMessageType;
	timestamp: number;
	role: ChatRole;
	content: string;
	parent: string | null;
	/**
	 * @deprecated - left for backward compatibility
	 */
	thinking?: string;
	/** Reasoning content produced by the model (separate from visible content) */
	reasoningContent?: string;
	/** Serialized JSON array of tool calls made by assistant messages */
	toolCalls?: string;
	/** Chat completion id streamed by the server, used to target realtime control (e.g. end reasoning) */
	completionId?: string;
	/** Tool call ID for tool result messages (role: 'tool') */
	toolCallId?: string;
	/** Working directory the tool call ran with (sent via the x-tool-cwd header), stored per call so the UI can show it accurately even after the conversation cwd changes */
	toolCwd?: string;
	/** Internal flag marking a UI-generated message (e.g. a cwd change). The row is sent to the model as a "user" turn so chat templates accept it; the flag is only read by the renderer. */
	isSynthetic?: boolean;
	/** Steps a compaction node keeps as written before it, read by the model after its summary */
	kept?: number;
	children: string[];
	extra?: DatabaseMessageExtra[];
	timings?: ChatMessageTimings;
	model?: string;
}

export type ExportedConversation = {
	conv: DatabaseConversation;
	messages: DatabaseMessage[];
};

export type ExportedConversations = ExportedConversation | ExportedConversation[];
