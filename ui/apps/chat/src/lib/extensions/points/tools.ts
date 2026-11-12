/**
 * The `tools` and `flow` extension points: tools the model can call that an
 * extension lists and runs, and hooks that run around every agentic flow.
 */

import type { ToolSource } from '$lib/enums';
import type { OpenAIToolDefinition, ToolExecutionResult } from '$lib/types';
import type { Component } from 'svelte';

export interface FlowInfo {
	conversationId: string;
}

/** Called when an agentic flow starts; a returned function runs when the flow ends. */
export type FlowHook = (flow: FlowInfo) => void | (() => void | Promise<void>);

export interface ToolProviderEntry {
	definition: OpenAIToolDefinition;
	/** The group the tool is listed under and switched off with, e.g. one MCP server's id. Not empty. */
	groupId: string;
	groupLabel: string;
}

export interface ToolProviderCall {
	/** The arguments as the model wrote them: a JSON string. */
	arguments: string;
	id: string;
	name: string;
}

/** What the tools panel says about a provider while there is no tool to list. */
export interface ToolProviderEmptyHint {
	/** How to get the tools, read in front of `toolsLabel`: "Enable MCP Server(s) to access". */
	action: string;
	/** The same as one full sentence, for the plain-text hint. */
	sentence: string;
	/** What the provider's tools are called: "MCP Tools". */
	toolsLabel: string;
}

export interface ToolGroupIdentityProps {
	groupId: string;
	label: string;
}

export interface ToolProvider {
	/** The tool category the provider's tools belong to. One provider per category. */
	source: ToolSource;
	/** How to get tools from the provider, shown while the tools panel is empty. */
	emptyHint?(): ToolProviderEmptyHint;
	/** The tools on offer right now. The tools store reads this reactively. */
	entries(): ToolProviderEntry[];
	/** Run one tool call. Throws when the call fails. */
	execute(call: ToolProviderCall, signal?: AbortSignal): Promise<ToolExecutionResult>;
	/** Icon URL of a group, when it has one. */
	groupIcon?(groupId: string): string | null;
	/** Draws a group's name in the tools settings, in place of the plain label. */
	groupIdentity?: Component<ToolGroupIdentityProps>;
	/** Whether the provider could offer tools under the current settings, connected or not. */
	isConfigured(): boolean;
	/** Get the tools ready to list and call, before a flow asks for them. */
	prepare?(): Promise<void>;
	/** Look for the tools again. Called when the tools panel opens. */
	refresh?(): void | Promise<void>;
	/** Icon URL for a call of this tool, also when the tool is not on offer any more. */
	toolIcon?(toolName: string): string | null;
}
