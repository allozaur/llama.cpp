import type { OpenAIToolDefinition } from './mcp';
import type { ToolSource } from '$lib/enums';
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
	/** For a tool listed under a group, the group's display name (an MCP server's label) */
	serverName?: string;
	/** For a tool listed under a group, the group's id (an MCP server's id), part of the keys */
	serverId?: string;
	/** Stable selection identity: <source>:name, or <source>-<serverId>:name under a group */
	key: string;
	definition: OpenAIToolDefinition;
}

export interface ToolGroup {
	source: ToolSource;
	/** Stable identity for keyed rendering and toggles, unique per group */
	key: string;
	label: string;
	/** For a group a tool provider lists, its id (an MCP server's id); unset for a category group */
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
