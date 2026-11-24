import {
	type AgentImportSession,
	type AgentImportTurn,
	cleanUserText,
	imageExtra,
	parseJsonLines,
	toMilliseconds
} from './agent-import.ts';
import { AgentImportSource } from '#lib/enums/agent-import.enums.ts';
import { MessageRole } from '#lib/enums/index.ts';
import type { DatabaseMessageExtra } from '#lib/types/index.ts';

type Json = Record<string, unknown>;

const RECORD_ASSISTANT = 'assistant';
const RECORD_USER = 'user';
const SYNTHETIC_MODEL = '<synthetic>';

function parts(content: unknown): Json[] {
	return Array.isArray(content) ? (content as Json[]) : [];
}

function textOf(content: unknown): string {
	if (typeof content === 'string') return content;

	return parts(content)
		.filter((part) => part.type === 'text' && typeof part.text === 'string')
		.map((part) => part.text as string)
		.join('\n');
}

/** The records from the last message back to the first one, in reading order. */
function activeChain(records: Json[]): Json[] {
	const byUuid = new Map<string, Json>();

	for (const record of records) {
		if (typeof record.uuid === 'string') byUuid.set(record.uuid, record);
	}

	let current = records.findLast(
		(record) =>
			(record.type === RECORD_USER || record.type === RECORD_ASSISTANT) &&
			typeof record.uuid === 'string' &&
			!record.isSidechain
	);

	const chain: Json[] = [];
	const seen = new Set<Json>();

	while (current && !seen.has(current)) {
		seen.add(current);
		chain.push(current);

		// a compaction starts a new chain and keeps the old one as its logical parent
		const parent = current.parentUuid ?? current.logicalParentUuid;

		current = typeof parent === 'string' ? byUuid.get(parent) : undefined;
	}

	return chain.reverse();
}

/** Every tool result of the session by the id of its call. */
function collectToolResults(records: Json[]): Map<string, AgentImportTurn> {
	const results = new Map<string, AgentImportTurn>();

	for (const record of records) {
		if (record.type !== RECORD_USER || record.isSidechain) continue;

		for (const part of parts((record.message as Json | undefined)?.content)) {
			if (part.type !== 'tool_result' || typeof part.tool_use_id !== 'string') continue;

			results.set(part.tool_use_id, {
				content: textOf(part.content),
				role: MessageRole.TOOL,
				timestamp: toMilliseconds(record.timestamp),
				toolCallId: part.tool_use_id
			});
		}
	}

	return results;
}

function userTurn(record: Json): AgentImportTurn | null {
	const content = (record.message as Json | undefined)?.content;
	const extra: DatabaseMessageExtra[] = [];
	const text =
		typeof content === 'string'
			? cleanUserText(content)
			: parts(content)
					.filter((part) => part.type === 'text' && typeof part.text === 'string')
					.map((part) => cleanUserText(part.text as string))
					.filter(Boolean)
					.join('\n\n');

	for (const part of parts(content)) {
		const source = part.source as Json | undefined;

		if (part.type === 'image' && source?.type === 'base64' && typeof source.data === 'string') {
			extra.push(imageExtra(extra.length, source.data, String(source.media_type ?? 'image/png')));
		}
	}

	if (!text && extra.length === 0) return null;

	return {
		content: text,
		extra,
		role: MessageRole.USER,
		timestamp: toMilliseconds(record.timestamp)
	};
}

/** The last title the session was given, by the user or by the app. */
function sessionName(records: Json[]): string | undefined {
	const titles = { ai: '', custom: '', summary: '' };

	for (const record of records) {
		if (record.type === 'custom-title' && typeof record.customTitle === 'string') {
			titles.custom = record.customTitle;
		} else if (record.type === 'ai-title' && typeof record.aiTitle === 'string') {
			titles.ai = record.aiTitle;
		} else if (record.type === 'summary' && typeof record.summary === 'string') {
			titles.summary = record.summary;
		}
	}

	return titles.custom || titles.ai || titles.summary || undefined;
}

/**
 * Parses a Claude Code transcript (`~/.claude/projects/<project>/<session>.jsonl`).
 *
 * What is kept:
 * - user text and pasted images (as image attachments)
 * - assistant text, thinking that has text (as reasoning) and the model name
 * - tool calls with their JSON input, and the text of each tool result
 *
 * What is dropped: messages the harness wrote (meta, reminders, command output, compaction
 * summaries, API errors), subagent sidechains, abandoned branches after a rewind, images and
 * documents inside tool results, thinking that is only a signature, and all bookkeeping records.
 */
export function parseClaudeCodeSession(text: string, fileName = ''): AgentImportSession | null {
	const records = parseJsonLines(text);
	const sessionId =
		fileName.replace(/\.jsonl$/i, '') ||
		(records.find((record) => typeof record.sessionId === 'string')?.sessionId as string);

	if (!sessionId) return null;

	const results = collectToolResults(records);
	const turns: AgentImportTurn[] = [];

	let openAssistant: { id: unknown; turn: AgentImportTurn } | null = null;

	// tool results follow the message that made the calls, also when they sit on a side branch
	const closeAssistant = () => {
		for (const call of openAssistant?.turn.toolCalls ?? []) {
			const result = call.id ? results.get(call.id) : undefined;

			if (result) turns.push(result);
		}

		openAssistant = null;
	};

	for (const record of activeChain(records)) {
		const message = record.message as Json | undefined;

		if (record.type === RECORD_USER) {
			const hasToolResult = parts(message?.content).some((part) => part.type === 'tool_result');

			// a tool result between two blocks of one assistant message does not end it
			if (!hasToolResult) closeAssistant();

			if (record.isMeta || record.isCompactSummary) continue;

			const turn = userTurn(record);

			if (turn) {
				closeAssistant();
				turns.push(turn);
			}

			continue;
		}

		if (record.type !== RECORD_ASSISTANT || record.isApiErrorMessage || !message) continue;

		if (!openAssistant || openAssistant.id !== message.id) {
			closeAssistant();

			const turn: AgentImportTurn = {
				content: '',
				role: MessageRole.ASSISTANT,
				timestamp: toMilliseconds(record.timestamp)
			};

			if (typeof message.model === 'string' && message.model !== SYNTHETIC_MODEL) {
				turn.model = message.model;
			}

			turns.push(turn);
			openAssistant = { id: message.id, turn };
		}

		const { turn } = openAssistant;

		for (const part of parts(message.content)) {
			if (part.type === 'text' && typeof part.text === 'string') {
				turn.content = [turn.content, part.text].filter(Boolean).join('\n\n');
			} else if (part.type === 'thinking' && typeof part.thinking === 'string' && part.thinking) {
				turn.reasoningContent = [turn.reasoningContent, part.thinking].filter(Boolean).join('\n\n');
			} else if (part.type === 'tool_use' && typeof part.id === 'string') {
				turn.toolCalls = [
					...(turn.toolCalls ?? []),
					{
						function: {
							arguments: JSON.stringify(part.input ?? {}),
							name: String(part.name ?? '')
						},
						id: part.id,
						type: 'function'
					}
				];
			}
		}
	}

	closeAssistant();

	return {
		id: sessionId,
		name: sessionName(records),
		source: AgentImportSource.CLAUDE_CODE,
		turns
	};
}
