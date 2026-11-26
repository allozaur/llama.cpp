/**
 * The `tools` and `flow` extension points: tools the model can call that an
 * extension lists and runs, and hooks that run around every agentic flow.
 */

import type { ServerToolType, ToolSource } from '#lib/enums/index.ts';
import type { OpenAIToolDefinition, ToolExecutionResult } from '#lib/types/index.ts';
import type { Component } from 'svelte';

export interface FlowInfo {
	conversationId: string;
}

/** Called when an agentic flow starts; a returned function runs when the flow ends. */
export type FlowHook = (flow: FlowInfo) => void | (() => void | Promise<void>);

/** A component of an extension with the props it is drawn with. */
export interface ToolCallPermissionDetail {
	component: Component<Record<string, unknown>>;
	props: Record<string, unknown>;
}

/** Pairs a detail component with its props, checked against each other. */
export function toolCallPermissionDetail<Props extends Record<string, unknown>>(
	component: Component<Props>,
	props: Props
): ToolCallPermissionDetail {
	return { component: component as Component<Record<string, unknown>>, props };
}

/**
 * What one call of a tool asks the user for, when that is narrower than the tool: a tool that
 * loads skills asks for the skill it would load, not for itself. The permission card asks for
 * it in place of the tool, and the answer is the provider's to keep.
 */
export interface ToolCallPermission {
	/** What allowing it for good reads in the card's menu: "Always allow this skill". */
	alwaysLabel: string;
	/** Drawn in the card under its question: what to know before answering. */
	detail?: ToolCallPermissionDetail;
	/** Allowed before, or nothing to ask: the call runs without a question. */
	isGranted: boolean;
	/** Who it is from, in place of the tool group's label. */
	source: string;
	/** What the card asks to allow, in place of the tool's name: "the skill hf-mem". */
	subject: string;
	/** The user said yes: for now, or with `always` for good. */
	allow(always: boolean): void;
}

export interface ToolProviderEntry {
	/**
	 * The permission a call of this tool needs, in place of the tool's own. A tool that has
	 * it has no tool permission to ask or to set. The provider still checks the permission
	 * when it runs the call.
	 */
	callPermission?(call: ToolProviderCall): Promise<ToolCallPermission>;
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
	/**
	 * How to get tools from the provider, shown while the tools panel is empty. Nothing when the provider's way to
	 * set it up is hidden, so the panel does not point at it.
	 */
	emptyHint?(): ToolProviderEmptyHint | undefined;
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
	/**
	 * llama-server's tools of this `/tools` type are the provider's to list and
	 * run, in place of the core's server tools: the provider reads them with
	 * `toolsStore.serverToolsOfType()`. While the provider is off, the core
	 * lists them as server tools again.
	 */
	serverToolType?: ServerToolType;
	/** Get the tools ready to list and call, before a flow asks for them. */
	prepare?(): Promise<void>;
	/** Look for the tools again. Called when the tools panel opens. */
	refresh?(): void | Promise<void>;
	/** Icon URL for a call of this tool, also when the tool is not on offer any more. */
	toolIcon?(toolName: string): string | null;
}
