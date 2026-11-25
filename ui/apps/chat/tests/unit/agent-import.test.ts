import { AgentImportSource } from '#lib/enums/agent-import.enums.ts';
import { AttachmentType, MessageRole, MessageType } from '#lib/enums/index.ts';
import {
	agentImportConversationId,
	buildAgentImportConversation,
	cleanUserText
} from '#lib/utils/agent-import.ts';
import { parseClaudeCodeSession } from '#lib/utils/agent-import-claude-code.ts';
import {
	detectAgentImportSource,
	groupAgentImportFiles,
	parseAgentImportFile
} from '#lib/utils/agent-import-files.ts';
import { describe, expect, it } from 'vitest';

const SESSION_ID = '11111111-2222-4333-8444-555555555555';
const SESSION_FILE = `${SESSION_ID}.jsonl`;

/** JSONL of the records; a string is written as it is, for a broken line. */
function jsonl(records: (object | string)[]): string {
	return records
		.map((record) => (typeof record === 'string' ? record : JSON.stringify(record)))
		.join('\n');
}

let clock = 0;

/** A Claude Code record with the fields every message record has. */
function cc(type: string, uuid: string, parentUuid: string | null, rest: object): object {
	clock += 1000;

	return {
		isSidechain: false,
		parentUuid,
		sessionId: SESSION_ID,
		timestamp: new Date(Date.UTC(2026, 0, 1) + clock).toISOString(),
		type,
		uuid,
		...rest
	};
}

function ccAssistant(uuid: string, parentUuid: string, id: string, content: object[]): object {
	return cc('assistant', uuid, parentUuid, {
		message: { content, id, model: 'claude-test-1', role: 'assistant' }
	});
}

function ccUser(uuid: string, parentUuid: string | null, content: unknown, rest = {}): object {
	return cc('user', uuid, parentUuid, { message: { content, role: 'user' }, ...rest });
}

// two parallel tool calls: the result of the first one sits on a side branch
const CLAUDE_CODE_SESSION = jsonl([
	{ customTitle: 'Old title', sessionId: SESSION_ID, type: 'custom-title' },
	ccUser('u1', null, '<system-reminder>ignore</system-reminder>\nList the files'),
	ccUser('m1', 'u1', '<local-command-stdout>noise</local-command-stdout>'),
	ccUser('m2', 'm1', 'meta note', { isMeta: true }),
	ccAssistant('a1', 'm2', 'msg_1', [{ signature: 'sig', thinking: '', type: 'thinking' }]),
	ccAssistant('a2', 'a1', 'msg_1', [{ thinking: 'I list them.', type: 'thinking' }]),
	ccAssistant('a3', 'a2', 'msg_1', [{ text: 'Looking.', type: 'text' }]),
	ccAssistant('a4', 'a3', 'msg_1', [
		{ id: 'toolu_1', input: { command: 'ls' }, name: 'Bash', type: 'tool_use' }
	]),
	ccAssistant('a5', 'a4', 'msg_1', [
		{ id: 'toolu_2', input: { file_path: '/tmp/a.txt' }, name: 'Read', type: 'tool_use' }
	]),
	ccUser('r1', 'a4', [{ content: 'a.txt', tool_use_id: 'toolu_1', type: 'tool_result' }]),
	ccUser('r2', 'a5', [
		{
			content: [
				{ text: 'file body', type: 'text' },
				{ source: { data: 'AAAA', media_type: 'image/png', type: 'base64' }, type: 'image' }
			],
			tool_use_id: 'toolu_2',
			type: 'tool_result'
		}
	]),
	ccAssistant('a6', 'r2', 'msg_2', [{ text: 'One file: a.txt', type: 'text' }]),
	// a subagent transcript inside the session file
	cc('user', 's1', 'a6', { isSidechain: true, message: { content: 'sidechain', role: 'user' } }),
	// an abandoned branch: the user went back and asked again
	ccUser('u2-old', 'a6', 'Abandoned question'),
	ccUser('u2', 'a6', [
		{ text: 'And this picture?', type: 'text' },
		{ source: { data: 'BBBB', media_type: 'image/jpeg', type: 'base64' }, type: 'image' }
	]),
	cc('assistant', 'e1', 'u2', {
		isApiErrorMessage: true,
		message: { content: [{ text: 'API Error', type: 'text' }], id: 'err', model: '<synthetic>' }
	}),
	ccAssistant('a7', 'e1', 'msg_3', [{ text: 'A cat.', type: 'text' }]),
	{ customTitle: 'List files', sessionId: SESSION_ID, type: 'custom-title' },
	'{"type":"assistant","uuid":"partial'
]);

describe('parseClaudeCodeSession', () => {
	const session = parseClaudeCodeSession(CLAUDE_CODE_SESSION, SESSION_FILE)!;
	const conversation = buildAgentImportConversation(session)!;
	const messages = conversation.messages;

	it('takes the session id from the file name and the last custom title', () => {
		expect(session.id).toBe(SESSION_ID);
		expect(conversation.conv.id).toBe(`claude-code-${SESSION_ID}`);
		expect(conversation.conv.name).toBe('List files');
	});

	it('keeps the active branch and drops harness, sidechain and error records', () => {
		expect(messages.map((message) => [message.role, message.content])).toEqual([
			[MessageRole.SYSTEM, ''],
			[MessageRole.USER, 'List the files'],
			[MessageRole.ASSISTANT, 'Looking.'],
			[MessageRole.TOOL, 'a.txt'],
			[MessageRole.TOOL, 'file body'],
			[MessageRole.ASSISTANT, 'One file: a.txt'],
			[MessageRole.USER, 'And this picture?'],
			[MessageRole.ASSISTANT, 'A cat.']
		]);
	});

	it('merges the blocks of one assistant message, with thinking and tool calls', () => {
		const assistant = messages[2];

		expect(assistant.reasoningContent).toBe('I list them.');
		expect(assistant.model).toBe('claude-test-1');
		expect(JSON.parse(assistant.toolCalls!)).toEqual([
			{
				function: { arguments: '{"command":"ls"}', name: 'Bash' },
				id: 'toolu_1',
				type: 'function'
			},
			{
				function: { arguments: '{"file_path":"/tmp/a.txt"}', name: 'Read' },
				id: 'toolu_2',
				type: 'function'
			}
		]);
		expect(messages[3].toolCallId).toBe('toolu_1');
		expect(messages[4].toolCallId).toBe('toolu_2');
		expect(messages[4].extra).toBeUndefined();
	});

	it('keeps a pasted image as an attachment', () => {
		expect(messages[6].extra).toEqual([
			{ base64Url: 'data:image/jpeg;base64,BBBB', name: 'image-1.jpeg', type: AttachmentType.IMAGE }
		]);
	});

	it('builds one chain under a root message', () => {
		expect(messages[0].type).toBe(MessageType.ROOT);
		expect(messages[0].parent).toBeNull();

		for (let i = 1; i < messages.length; i++) {
			expect(messages[i].parent).toBe(messages[i - 1].id);
			expect(messages[i - 1].children).toEqual([messages[i].id]);
			expect(messages[i].convId).toBe(conversation.conv.id);
		}

		expect(conversation.conv.currNode).toBe(messages.at(-1)!.id);
		expect(conversation.conv.lastModified).toBe(messages.at(-1)!.timestamp);
		expect(messages.at(-1)!.timestamp).toBeGreaterThan(messages[1].timestamp);
	});

	it('gives the same ids when the file is parsed again', () => {
		const again = buildAgentImportConversation(
			parseClaudeCodeSession(CLAUDE_CODE_SESSION, SESSION_FILE)!
		)!;

		expect(again.conv.id).toBe(conversation.conv.id);
		expect(again.messages.map((message) => message.id)).toEqual(
			messages.map((message) => message.id)
		);
	});

	it('reads across a compaction and drops its summary', () => {
		const compacted = jsonl([
			ccUser('u1', null, 'First question'),
			ccAssistant('a1', 'u1', 'msg_1', [{ text: 'First answer', type: 'text' }]),
			cc('system', 'c1', null, { logicalParentUuid: 'a1', subtype: 'compact_boundary' }),
			ccUser('c2', 'c1', 'This session is being continued...', { isCompactSummary: true }),
			ccUser('u2', 'c2', 'Second question'),
			ccAssistant('a2', 'u2', 'msg_2', [{ text: 'Second answer', type: 'text' }])
		]);
		const turns = parseClaudeCodeSession(compacted, SESSION_FILE)!.turns;

		expect(turns.map((turn) => turn.content)).toEqual([
			'First question',
			'First answer',
			'Second question',
			'Second answer'
		]);
	});

	it('names an untitled session after its first prompt and skips an empty one', () => {
		const untitled = jsonl([ccUser('u1', null, `${'word '.repeat(40)}\nsecond line`)]);
		const built = buildAgentImportConversation(parseClaudeCodeSession(untitled, SESSION_FILE)!)!;

		expect(built.conv.name).toHaveLength(83);
		expect(built.conv.name.endsWith('...')).toBe(true);

		const empty = jsonl([{ sessionId: SESSION_ID, type: 'file-history-snapshot' }]);

		expect(buildAgentImportConversation(parseClaudeCodeSession(empty, SESSION_FILE)!)).toBeNull();
	});
});

describe('agent import helpers', () => {
	it('derives the conversation id from the source and the session id', () => {
		expect(agentImportConversationId(AgentImportSource.CLAUDE_CODE, 'abc')).toBe('claude-code-abc');
	});

	it('cuts reminders and drops harness messages', () => {
		expect(cleanUserText('Hi <system-reminder>x</system-reminder> there')).toBe('Hi  there');
		expect(cleanUserText('<task-notification>done</task-notification>')).toBe('');
		expect(cleanUserText('<div>my html</div>')).toBe('<div>my html</div>');
	});

	it('detects a session file from its path', () => {
		expect(detectAgentImportSource(`projects/-tmp-app/${SESSION_FILE}`)).toBe(
			AgentImportSource.CLAUDE_CODE
		);
		expect(
			detectAgentImportSource(`projects/-tmp-app/${SESSION_ID}/subagents/agent-1.jsonl`)
		).toBeNull();
		expect(detectAgentImportSource('settings.json')).toBeNull();
		expect(detectAgentImportSource('notes.txt', '"sessionId" "type"')).toBeNull();
	});

	it('detects a renamed session file from its content', async () => {
		const groups = await groupAgentImportFiles([
			{ file: new File([CLAUDE_CODE_SESSION], 'session.jsonl'), path: 'session.jsonl' },
			{ file: new File(['{"theme":"dark"}'], 'other.jsonl'), path: 'other.jsonl' },
			{ file: new File(['{"theme":"dark"}'], 'settings.json'), path: 'settings.json' }
		]);

		expect(groups.get(AgentImportSource.CLAUDE_CODE)).toHaveLength(1);
		expect(groups.size).toBe(1);
	});

	it('parses a file into conversations for the import', () => {
		const [conversation] = parseAgentImportFile(CLAUDE_CODE_SESSION, SESSION_FILE);

		expect(conversation.conv.id).toBe(`claude-code-${SESSION_ID}`);
	});
});
