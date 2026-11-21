/**
 * Context breakdown: what fills a conversation's context window, part by part.
 *
 * llama-server reports one exact figure, the tokens of the last request and its
 * reply. The parts are estimated from the characters of what was sent: the
 * system prompt and the tool definitions as they are, and the messages as the
 * rest of the exact figure, so the parts add up to what the server counted.
 */

import { TOOL_LOADING } from '#lib/constants/index.ts';
import { ContextSegment, ToolSource } from '#lib/enums/index.ts';

/** A message as the context sees it: the harness's request shape, or a stored message mapped to it. */
export interface ContextMessage {
	role: string;
	content?: unknown;
	reasoning_content?: string;
	tool_calls?: unknown;
}

/** A tool definition as sent, in the OpenAI chat-completions shape. */
export interface ContextToolDefinition {
	function: { name: string; description?: string; parameters?: unknown };
}

export interface ContextToolInfo {
	source: ToolSource | null;
	/** The MCP server's name, for an MCP tool. */
	server?: string;
}

export interface ContextBreakdownInput {
	/** The messages of the request, the system prompt included. */
	messages: readonly ContextMessage[];
	/** The tool definitions the request sent. */
	tools: readonly ContextToolDefinition[];
	/** Tools that can be loaded on demand, listed by name only. */
	deferred?: readonly ContextToolDefinition[];
	toolInfo: (name: string) => ContextToolInfo;
	/** Tokens llama-server counted for the last request and its reply, null before any. */
	usedTokens: number | null;
	/** The context window, null while unknown. */
	contextTotal: number | null;
}

export interface ContextBreakdownItem {
	key: string;
	label: string;
	/** A second part of the label, such as the MCP server. */
	detail?: string;
	tokens: number;
}

export interface ContextBreakdownPart {
	segment: ContextSegment;
	tokens: number;
	/** Counted from characters, not by the server. */
	estimated: boolean;
	items: ContextBreakdownItem[];
}

export interface ContextBreakdown {
	total: number | null;
	used: number;
	/** The used figure is llama-server's own count; false while it is estimated. */
	usedExact: boolean;
	/** The parts in the window, in display order, free space last when the window is known. */
	parts: ContextBreakdownPart[];
	/** Parts that take no room until loaded. */
	deferred: ContextBreakdownPart[];
}

const DISPLAY_ORDER = [
	ContextSegment.MESSAGES,
	ContextSegment.SYSTEM_TOOLS,
	ContextSegment.MCP_TOOLS,
	ContextSegment.CUSTOM_TOOLS,
	ContextSegment.SYSTEM_PROMPT
];
const MESSAGE_ITEMS = [
	{ key: 'user', label: 'User' },
	{ key: 'assistant', label: 'Assistant' },
	{ key: 'reasoning', label: 'Reasoning' },
	{ key: 'tool-calls', label: 'Tool calls' },
	{ key: 'tool-results', label: 'Tool results' }
] as const;

type MessageItemKey = (typeof MESSAGE_ITEMS)[number]['key'];

export function estimateTokens(chars: number): number {
	return Math.ceil(chars / TOOL_LOADING.CHARS_PER_TOKEN);
}

/** Characters of text in a message's content; media is left out, its tokens are not in its characters. */
function contentChars(content: unknown): number {
	if (typeof content === 'string') return content.length;

	if (!Array.isArray(content)) return 0;

	return content.reduce(
		(sum: number, part: { type?: string; text?: string }) =>
			sum + (part?.type === 'text' && typeof part.text === 'string' ? part.text.length : 0),
		0
	);
}

function toolCallChars(toolCalls: unknown): number {
	if (!toolCalls) return 0;

	if (typeof toolCalls === 'string') return toolCalls.length;

	return JSON.stringify(toolCalls).length;
}

function toolSegment(info: ContextToolInfo): ContextSegment {
	if (info.source === ToolSource.MCP) return ContextSegment.MCP_TOOLS;

	if (info.source === ToolSource.CUSTOM) return ContextSegment.CUSTOM_TOOLS;

	// server and built-in tools, and the search tool that loads the others
	return ContextSegment.SYSTEM_TOOLS;
}

function toolItem(tool: ContextToolDefinition, info: ContextToolInfo): ContextBreakdownItem {
	const name = tool.function.name;

	return {
		detail: info.source === ToolSource.MCP ? info.server || undefined : undefined,
		key: name,
		label: name,
		tokens: estimateTokens(JSON.stringify(tool).length)
	};
}

function emptyPart(segment: ContextSegment): ContextBreakdownPart {
	return { estimated: true, items: [], segment, tokens: 0 };
}

function sumItems(part: ContextBreakdownPart): void {
	part.tokens = part.items.reduce((sum, item) => sum + item.tokens, 0);
}

/** Spread a total over items in proportion to their own figures, rounding so they still add up. */
function scaleItems(items: ContextBreakdownItem[], total: number): ContextBreakdownItem[] {
	const sum = items.reduce((acc, item) => acc + item.tokens, 0);

	if (sum === 0) return items;

	let left = total;

	return items.map((item, index) => {
		const tokens = index === items.length - 1 ? left : Math.round((item.tokens / sum) * total);

		left -= tokens;

		return { ...item, tokens: Math.max(0, tokens) };
	});
}

export function buildContextBreakdown(input: ContextBreakdownInput): ContextBreakdown {
	const { contextTotal, deferred = [], messages, toolInfo, tools, usedTokens } = input;
	const parts = new Map<ContextSegment, ContextBreakdownPart>(
		DISPLAY_ORDER.map((segment) => [segment, emptyPart(segment)])
	);

	for (const tool of tools) {
		const info = toolInfo(tool.function.name);

		parts.get(toolSegment(info))!.items.push(toolItem(tool, info));
	}

	const messageChars: Record<MessageItemKey, number> = {
		assistant: 0,
		reasoning: 0,
		'tool-calls': 0,
		'tool-results': 0,
		user: 0
	};

	let systemChars = 0;

	for (const message of messages) {
		const chars = contentChars(message.content);

		if (message.role === 'system') {
			systemChars += chars;
		} else if (message.role === 'tool') {
			messageChars['tool-results'] += chars;
		} else if (message.role === 'assistant') {
			messageChars.assistant += chars;
			messageChars.reasoning += message.reasoning_content?.length ?? 0;
			messageChars['tool-calls'] += toolCallChars(message.tool_calls);
		} else {
			messageChars.user += chars;
		}
	}

	const systemPrompt = parts.get(ContextSegment.SYSTEM_PROMPT)!;

	systemPrompt.tokens = estimateTokens(systemChars);

	for (const segment of [
		ContextSegment.SYSTEM_TOOLS,
		ContextSegment.MCP_TOOLS,
		ContextSegment.CUSTOM_TOOLS
	]) {
		const part = parts.get(segment)!;

		part.items.sort((a, b) => b.tokens - a.tokens);
		sumItems(part);
	}

	const fixed = [...parts.values()].reduce((sum, part) => sum + part.tokens, 0);
	const messagesPart = parts.get(ContextSegment.MESSAGES)!;
	const messageItems = MESSAGE_ITEMS.map(({ key, label }) => ({
		key,
		label,
		tokens: estimateTokens(messageChars[key])
	})).filter((item) => item.tokens > 0);
	const estimatedMessages = messageItems.reduce((sum, item) => sum + item.tokens, 0);
	const usedExact = usedTokens !== null && usedTokens > 0;

	// the messages take the rest of the server's figure, so the parts add up to it
	messagesPart.tokens = usedExact ? Math.max(0, usedTokens - fixed) : estimatedMessages;
	messagesPart.estimated = !usedExact;
	messagesPart.items = scaleItems(messageItems, messagesPart.tokens);

	const inWindow = DISPLAY_ORDER.map((segment) => parts.get(segment)!).filter(
		(part) => part.tokens > 0
	);
	const used = usedExact ? Math.max(usedTokens, fixed) : fixed + messagesPart.tokens;

	if (contextTotal !== null && contextTotal > 0) {
		inWindow.push({
			estimated: false,
			items: [],
			segment: ContextSegment.FREE,
			tokens: Math.max(0, contextTotal - used)
		});
	}

	const deferredParts = new Map<ContextSegment, ContextBreakdownPart>();

	for (const tool of deferred) {
		const info = toolInfo(tool.function.name);
		const segment = toolSegment(info);
		const part = deferredParts.get(segment) ?? emptyPart(segment);

		part.items.push(toolItem(tool, info));
		deferredParts.set(segment, part);
	}

	for (const part of deferredParts.values()) {
		part.items.sort((a, b) => b.tokens - a.tokens);
		sumItems(part);
	}

	return {
		deferred: DISPLAY_ORDER.map((segment) => deferredParts.get(segment)).filter(
			(part): part is ContextBreakdownPart => !!part
		),
		parts: inWindow,
		total: contextTotal,
		used,
		usedExact
	};
}

/** Share of the window in percent, null while the window is unknown. */
export function contextShare(tokens: number, total: number | null): number | null {
	if (total === null || total <= 0) return null;

	return (tokens / total) * 100;
}

/** A share as the breakdown prints it: one decimal, "<0.1%" for a sliver, "—" with none. */
export function formatContextShare(share: number | null): string {
	if (share === null) return '—';

	if (share > 0 && share < 0.1) return '<0.1%';

	return `${share.toFixed(1)}%`;
}

function trimZero(value: string): string {
	return value.endsWith('.0') ? value.slice(0, -2) : value;
}

/** A token count in short form: 812, 129.6K, 1M. */
export function formatTokenCount(tokens: number): string {
	if (tokens < 1000) return `${Math.round(tokens)}`;

	const thousands = Number((tokens / 1e3).toFixed(1));

	if (thousands < 1000) return `${trimZero(thousands.toFixed(1))}K`;

	return `${trimZero((tokens / 1e6).toFixed(1))}M`;
}
