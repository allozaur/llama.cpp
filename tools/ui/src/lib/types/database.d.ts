import { AttachmentType, ReasoningEffort, ToolSource } from '$lib/enums';
import type { ChatMessageTimings, ChatMessageType, ChatRole } from '$lib/types/chat';
import type { Group } from '$lib/types/groups';
import type { Project } from '$lib/types/projects';

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

/** Standalone records stored next to conversations, by table name. */
export interface DatabaseRecords {
	groups: Group;
	projects: Project;
	prompts: DatabasePrompt;
}

export type DatabaseRecordKind = keyof DatabaseRecords;

/**
 * Row-level storage for conversations and messages. Implementations only read
 * and write rows; tree rules live in DatabaseService and utils/conversation-tree.
 */
export interface StorageBackend {
	/** Runs `fn` atomically; backend calls made inside it join the same transaction. */
	transaction<T>(fn: () => Promise<T>): Promise<T>;

	/** All conversations, most recently modified first. */
	listConversations(): Promise<DatabaseConversation[]>;
	/** One entry per id, `undefined` where the conversation does not exist. */
	getConversations(ids: string[]): Promise<(DatabaseConversation | undefined)[]>;
	/** Fails if a conversation with the same id exists. */
	addConversation(conv: DatabaseConversation): Promise<void>;
	putConversations(convs: DatabaseConversation[]): Promise<void>;
	/** Shallow-merges `updates` into the row; a no-op when it does not exist. */
	updateConversation(id: string, updates: Partial<Omit<DatabaseConversation, 'id'>>): Promise<void>;
	/** Deletes the conversations together with all of their messages. */
	deleteConversations(ids: string[]): Promise<void>;

	getMessage(id: string): Promise<DatabaseMessage | undefined>;
	/** Messages of the given conversations, in no guaranteed order. */
	getMessages(convIds: string[]): Promise<DatabaseMessage[]>;
	/** Fails if a message with the same id exists. */
	addMessages(messages: DatabaseMessage[]): Promise<void>;
	putMessages(messages: DatabaseMessage[]): Promise<void>;
	/** Shallow-merges `updates` into the row; a no-op when it does not exist. */
	updateMessage(id: string, updates: Partial<Omit<DatabaseMessage, 'id'>>): Promise<void>;
	deleteMessages(ids: string[]): Promise<void>;

	/** All records of a kind, in no guaranteed order. */
	listRecords<K extends DatabaseRecordKind>(kind: K): Promise<DatabaseRecords[K][]>;
	/** Fails if a record of that kind with the same id exists. */
	addRecord<K extends DatabaseRecordKind>(kind: K, record: DatabaseRecords[K]): Promise<void>;
	/**
	 * Shallow-merges `updates` into the record, an `undefined` value removes the
	 * field; a no-op when it does not exist.
	 */
	updateRecord<K extends DatabaseRecordKind>(
		kind: K,
		id: string,
		updates: Partial<Omit<DatabaseRecords[K], 'id'>>
	): Promise<void>;
	deleteRecord(kind: DatabaseRecordKind, id: string): Promise<void>;
}
