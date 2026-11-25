import {
	AGENT_IMPORT_HARNESS_TAGS,
	AGENT_IMPORT_SOURCES
} from '#lib/constants/agent-import.constants.ts';
import { AgentImportSource } from '#lib/enums/agent-import.enums.ts';
import { AttachmentType, MessageRole, MessageType } from '#lib/enums/index.ts';
import type {
	ApiChatCompletionToolCall,
	DatabaseMessage,
	DatabaseMessageExtra,
	ExportedConversation
} from '#lib/types/index.ts';

/** One message of a session, before it gets its place in the message tree. */
export interface AgentImportTurn {
	content: string;
	extra?: DatabaseMessageExtra[];
	model?: string;
	reasoningContent?: string;
	role: MessageRole;
	/** Milliseconds; 0 when the source has no time for the turn. */
	timestamp: number;
	/** For a tool turn: the call it answers. */
	toolCallId?: string;
	toolCalls?: ApiChatCompletionToolCall[];
}

/** A session as a parser returns it. */
export interface AgentImportSession {
	/** The id the source gave the session. The conversation id is derived from it. */
	id: string;
	/** Title from the source; the first user message is used when it is empty. */
	name?: string;
	source: AgentImportSource;
	turns: AgentImportTurn[];
}

const TITLE_MAX_LENGTH = 80;
const PARAGRAPH_BREAK = '\n\n';
const SYSTEM_REMINDER_BLOCK = /<system-reminder>[\s\S]*?<\/system-reminder>/g;
const LEADING_TAG = /^<([a-z][a-z0-9_-]*)[\s>/]/i;

/**
 * Conversation id of an imported session. It depends only on the source and the session id,
 * so a second import finds the conversation in the database and skips it.
 */
export function agentImportConversationId(source: AgentImportSource, sessionId: string): string {
	return `${source}-${sessionId}`;
}

/** Text the user typed: reminders the harness added are cut, a harness message gives ''. */
export function cleanUserText(text: string): string {
	const cleaned = text.replace(SYSTEM_REMINDER_BLOCK, '').trim();
	const tag = LEADING_TAG.exec(cleaned)?.[1];

	return tag && AGENT_IMPORT_HARNESS_TAGS.includes(tag.toLowerCase()) ? '' : cleaned;
}

/** An image attachment from base64 data or from a data URL. */
export function imageExtra(index: number, data: string, mimeType?: string): DatabaseMessageExtra {
	const extension = mimeType?.split('/')[1] ?? 'png';

	return {
		base64Url: mimeType ? `data:${mimeType};base64,${data}` : data,
		name: `image-${index + 1}.${extension}`,
		type: AttachmentType.IMAGE
	};
}

/** Time of an ISO string or of a number of seconds, in milliseconds. 0 when it cannot be read. */
export function toMilliseconds(value: unknown): number {
	if (typeof value === 'number') return Number.isFinite(value) ? Math.round(value * 1000) : 0;

	if (typeof value !== 'string') return 0;

	const parsed = Date.parse(value);

	return Number.isNaN(parsed) ? 0 : parsed;
}

/** The lines of a JSONL file as objects. A line that is not a JSON object is skipped. */
export function parseJsonLines(text: string): Record<string, unknown>[] {
	const records: Record<string, unknown>[] = [];

	for (const line of text.split('\n')) {
		if (!line.trim()) continue;

		try {
			const parsed: unknown = JSON.parse(line);

			if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
				records.push(parsed as Record<string, unknown>);
			}
		} catch {
			// a session that is still written to can end in a partial line
		}
	}

	return records;
}

function isEmptyTurn(turn: AgentImportTurn): boolean {
	return (
		!turn.content.trim() && !turn.reasoningContent && !turn.toolCalls?.length && !turn.extra?.length
	);
}

function joinText(a: string | undefined, b: string | undefined): string {
	return [a, b].filter((part) => part?.trim()).join(PARAGRAPH_BREAK);
}

/**
 * Makes the turns fit the app's message chain: empty turns and tool results without a call
 * are dropped, and an assistant turn that follows an assistant turn without tool calls is
 * merged into it (sources write one record per text block).
 */
function normalizeTurns(turns: AgentImportTurn[]): AgentImportTurn[] {
	const result: AgentImportTurn[] = [];
	const callIds = new Set<string>();

	for (const turn of turns) {
		if (turn.role === MessageRole.TOOL) {
			if (!turn.toolCallId || !callIds.has(turn.toolCallId)) continue;

			// one result per call
			callIds.delete(turn.toolCallId);
			result.push(turn);

			continue;
		}

		if (isEmptyTurn(turn)) continue;

		const previous = result.at(-1);

		if (
			turn.role === MessageRole.ASSISTANT &&
			previous?.role === MessageRole.ASSISTANT &&
			!previous.toolCalls?.length
		) {
			previous.content = joinText(previous.content, turn.content);
			previous.reasoningContent =
				joinText(previous.reasoningContent, turn.reasoningContent) || undefined;
			previous.toolCalls = turn.toolCalls;
			previous.model = turn.model ?? previous.model;
			previous.timestamp = turn.timestamp || previous.timestamp;
		} else {
			result.push({ ...turn });
		}

		for (const call of turn.toolCalls ?? []) {
			if (call.id) callIds.add(call.id);
		}
	}

	return result;
}

function sessionTitle(session: AgentImportSession, turns: AgentImportTurn[]): string {
	const firstPrompt = turns.find((turn) => turn.role === MessageRole.USER && turn.content.trim());
	const title = (session.name?.trim() || firstPrompt?.content.trim() || '').split('\n')[0].trim();

	if (!title) return `${AGENT_IMPORT_SOURCES[session.source].name} session`;

	return title.length > TITLE_MAX_LENGTH ? `${title.slice(0, TITLE_MAX_LENGTH)}...` : title;
}

/**
 * Turns a parsed session into the records the conversation import takes: a root message and
 * one chain of messages under it. Returns null when the session has no user or assistant turn.
 */
export function buildAgentImportConversation(
	session: AgentImportSession
): ExportedConversation | null {
	const turns = normalizeTurns(session.turns);

	if (!turns.some((turn) => turn.role !== MessageRole.TOOL)) return null;

	const convId = agentImportConversationId(session.source, session.id);
	const firstTimestamp = turns.find((turn) => turn.timestamp)?.timestamp ?? 0;
	const root: DatabaseMessage = {
		children: [],
		content: '',
		convId,
		id: `${convId}-root`,
		parent: null,
		role: MessageRole.SYSTEM,
		timestamp: firstTimestamp,
		toolCalls: '',
		type: MessageType.ROOT
	};
	const messages = [root];

	let timestamp = firstTimestamp;

	turns.forEach((turn, index) => {
		const parent = messages[messages.length - 1];
		const id = `${convId}-${index}`;

		timestamp = turn.timestamp || timestamp;
		parent.children = [id];
		messages.push({
			children: [],
			content: turn.content,
			convId,
			id,
			parent: parent.id,
			role: turn.role,
			timestamp,
			type: MessageType.TEXT,
			...(turn.extra?.length ? { extra: turn.extra } : {}),
			...(turn.model ? { model: turn.model } : {}),
			...(turn.reasoningContent ? { reasoningContent: turn.reasoningContent } : {}),
			...(turn.toolCallId ? { toolCallId: turn.toolCallId } : {}),
			...(turn.toolCalls?.length ? { toolCalls: JSON.stringify(turn.toolCalls) } : {})
		});
	});

	return {
		conv: {
			currNode: messages[messages.length - 1].id,
			id: convId,
			lastModified: timestamp,
			name: sessionTitle(session, turns)
		},
		messages
	};
}
