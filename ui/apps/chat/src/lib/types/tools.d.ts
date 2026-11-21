import type { OpenAIToolDefinition } from './mcp';
import type { BackgroundTaskStatus, ToolSource } from '#lib/enums/index.ts';
import type { Component } from 'svelte';

/**
 * UI metadata for a server or browser tool, keyed by its `BuiltInTool` id.
 */
export interface ToolUiEntry {
	icon: Component;
	label: string;
	source: ToolSource.SERVER | ToolSource.BROWSER;
}

export interface ToolEntry {
	source: ToolSource;
	/** For MCP tools, the server display name (used for UI grouping) */
	serverName?: string;
	/** For MCP tools, the server ID (used for permission keys) */
	serverId?: string;
	/** Stable selection identity: server:name, mcp-<serverId>:name, mcp:name, custom:name */
	key: string;
	definition: OpenAIToolDefinition;
}

export interface ToolGroup {
	source: ToolSource;
	/** Stable identity for keyed rendering and toggles, unique per group */
	key: string;
	label: string;
	/** For MCP groups, the server ID */
	serverId?: string;
	tools: ToolEntry[];
}

export interface WriteFileMeta {
	/** Undefined until the call streams a path; content renders without it. */
	fileName?: string;
	filePath?: string;
	language: string;
	/** Undefined until the args carry a content string; an empty write is ''. */
	content?: string;
	bytesWritten?: number;
	resultMessage?: string;
	errorMessage?: string;
}

/** Everything the write_file block title and status pill show; the full meta
 *  ( with the embedded file content ) stays body-only so collapsed blocks
 *  never parse the content blob. */
export interface WriteFileTitleMeta {
	fileName?: string;
	filePath?: string;
	language: string;
	bytesWritten?: number;
	resultMessage?: string;
	errorMessage?: string;
}

export interface EditFileEdit {
	oldText: string;
	newText: string;
}

export interface EditFileMeta {
	/** Undefined until the call streams a path; the edits render without it. */
	fileName?: string;
	filePath?: string;
	edits: EditFileEdit[];
	resultMessage?: string;
	editsApplied?: number;
	errorMessage?: string;
}

/** Everything the edit_file block title and status pill show; the full meta
 *  ( with the embedded edit strings ) stays body-only so collapsed blocks
 *  never parse the args blob. */
export interface EditFileTitleMeta {
	fileName?: string;
	filePath?: string;
	resultMessage?: string;
	editsApplied?: number;
	errorMessage?: string;
}

/** One background task in the `shell_task` `list` reply, as llama-server sends it */
export interface ShellTaskInfo {
	task_id: number;
	command: string;
	cwd: string;
	status: BackgroundTaskStatus;
	exit_code: number | null;
	/** Unix time in ms */
	started_at: number;
	ended_at: number | null;
	output_size: number;
}

/** The `shell_task` `output` reply: the task, plus its output from an offset on */
export interface ShellTaskOutput extends ShellTaskInfo {
	output: string;
	offset: number;
	next_offset: number;
	skipped: number;
}

/** A background shell task as Llama Chat keeps it */
export interface BackgroundTask {
	/** Stable across llama-server restarts, which reuse task ids: `<startedAt>-<id>` */
	key: string;
	id: number;
	command: string;
	cwd: string;
	/** The conversation whose tool call started it, when this app started it */
	conversationId: string | null;
	status: BackgroundTaskStatus;
	exitCode: number | null;
	startedAt: number;
	endedAt: number | null;
	/** The newest output read so far, trimmed at the front past a size cap */
	output: string;
	/** Server byte offset to read on from */
	nextOffset: number;
}
