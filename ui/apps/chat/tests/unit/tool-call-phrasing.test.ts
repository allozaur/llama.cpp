import {
	describeToolActivity,
	describeToolCall,
	formatToolCallLine,
	groupToolCallRuns,
	humanizeArgKey,
	simpleToolArgFields,
	summarizeToolCalls
} from '#lib/components/app/chat/ChatMessages/ChatMessage/ChatMessageToolCall/parsers/tool-call-phrasing.ts';
import { AgenticSectionType, BuiltInTool } from '#lib/enums/index.ts';
import type { AgenticSection } from '#lib/types/index.ts';
import { describe, expect, it } from 'vitest';

function call(
	toolName: string,
	args: Record<string, unknown> | string = {},
	type = AgenticSectionType.TOOL_CALL,
	toolCallId?: string
): AgenticSection {
	return {
		content: '',
		toolArgs: typeof args === 'string' ? args : JSON.stringify(args),
		toolCallId,
		toolName,
		toolResult: type === AgenticSectionType.TOOL_CALL ? 'ok' : undefined,
		type
	};
}

function line(toolName: string, args: Record<string, unknown> | string = {}, running = false) {
	return formatToolCallLine(
		describeToolCall(toolName, typeof args === 'string' ? args : JSON.stringify(args), running)
	);
}

describe('describeToolCall', () => {
	it('phrases built-in tools in the past tense', () => {
		expect(line(BuiltInTool.SERVER_EXEC_SHELL_COMMAND, { command: 'git status' })).toBe(
			'Ran a command'
		);
		expect(line(BuiltInTool.SERVER_READ_FILE, { path: '/tmp/x/sheet_new.jpg' })).toBe(
			'Read sheet_new.jpg'
		);
		expect(line(BuiltInTool.SERVER_EDIT_FILE, { edits: [], path: 'a/harness-roadmap.html' })).toBe(
			'Edited harness-roadmap.html'
		);
		expect(line(BuiltInTool.SERVER_WRITE_FILE, { content: 'x', file_path: 'b/notes.md' })).toBe(
			'Wrote notes.md'
		);
		expect(line(BuiltInTool.SERVER_GREP_SEARCH, { path: '.', pattern: 'issue' })).toBe(
			"Searched for 'issue'"
		);
		expect(line(BuiltInTool.SERVER_FILE_GLOB_SEARCH, { include: '*.ts', path: '.' })).toBe(
			"Listed files matching '*.ts'"
		);
		expect(line(BuiltInTool.SERVER_FILE_GLOB_SEARCH, { include: '**', path: '.' })).toBe(
			'Listed files'
		);
		expect(line(BuiltInTool.BROWSER_SEARCH_CHATS, { by_matches: ['llama', 'gguf'] })).toBe(
			"Searched chats for 'llama, gguf'"
		);
		expect(line(BuiltInTool.SERVER_GET_INFO)).toBe('Checked runtime info');
		expect(line(BuiltInTool.BROWSER_RUN_JAVASCRIPT, { code: '1+1' })).toBe('Ran JavaScript');
	});

	it('uses the present tense while running', () => {
		expect(line(BuiltInTool.SERVER_EXEC_SHELL_COMMAND, { command: 'ls' }, true)).toBe(
			'Running a command'
		);
		expect(line(BuiltInTool.SERVER_READ_FILE, { path: 'package.json' }, true)).toBe(
			'Reading package.json'
		);
		expect(line(BuiltInTool.BROWSER_SEARCH_CHATS, {}, true)).toBe('Searching chats');
	});

	it('falls back to the object when the target has not streamed yet', () => {
		expect(line(BuiltInTool.SERVER_READ_FILE, '{"pa', true)).toBe('Reading a file');
		expect(line(BuiltInTool.SERVER_GREP_SEARCH, '')).toBe('Searched files');
	});

	it('reads a path from partial args', () => {
		expect(
			line(BuiltInTool.SERVER_WRITE_FILE, '{"path": "src/app.ts", "content": "abc', true)
		).toBe('Writing app.ts');
	});

	it('phrases tool_search select queries as loading tools', () => {
		expect(line('tool_search', { query: 'select:Monitor' })).toBe('Loaded tools Monitor');
		expect(line('tool_search', { query: 'select:a, b' }, true)).toBe('Loading tools a, b');
		expect(line('tool_search', { query: 'slack messages' })).toBe(
			"Searched tools for 'slack messages'"
		);
	});

	it('phrases web search tools', () => {
		expect(line('web_search_exa', { query: 'llama.cpp' })).toBe("Searched the web for 'llama.cpp'");
	});

	it('gives MCP and unknown tools a generic line with their main argument', () => {
		expect(line('get_weather', { city: 'Warsaw' })).toBe('Used get_weather Warsaw');
		expect(line('fetch_page', { timeout: 5, url: 'https://example.com' })).toBe(
			'Used fetch_page https://example.com'
		);
		expect(line('list_things', {})).toBe('Used list_things');
		expect(line('summarize_issue', { issue: 31273 })).toBe('Used summarize_issue 31273');
		expect(line('list_things', {}, true)).toBe('Using list_things');
	});

	it('shortens long targets to one line', () => {
		const text = describeToolCall('my_tool', JSON.stringify({ query: 'word '.repeat(40) })).target;

		expect(text?.length).toBe(60);
		expect(text?.endsWith('...')).toBe(true);
		expect(text).not.toContain('\n');
	});
});

describe('summarizeToolCalls', () => {
	it('counts calls per kind in first-seen order', () => {
		const sections = [
			call(BuiltInTool.SERVER_EXEC_SHELL_COMMAND, { command: 'a' }),
			call(BuiltInTool.SERVER_READ_FILE, { path: 'a' }),
			call(BuiltInTool.SERVER_EXEC_SHELL_COMMAND, { command: 'b' }),
			call(BuiltInTool.SERVER_WRITE_FILE, { path: 'c' }),
			call(BuiltInTool.SERVER_WRITE_FILE, { path: 'd' }),
			call(BuiltInTool.SERVER_READ_FILE, { path: 'b' })
		];

		expect(summarizeToolCalls(sections)).toBe('Ran 2 commands, read 2 files, wrote 2 files');
	});

	it('uses singular forms and merges search tools', () => {
		const sections = [
			call(BuiltInTool.SERVER_EDIT_FILE, { path: 'a' }),
			call(BuiltInTool.SERVER_GREP_SEARCH, { pattern: 'x' }),
			call(BuiltInTool.BROWSER_SEARCH_CHATS, { by_matches: ['y'] })
		];

		expect(summarizeToolCalls(sections)).toBe('Edited 1 file, searched 2 times');
		expect(summarizeToolCalls([call(BuiltInTool.SERVER_GREP_SEARCH)])).toBe('Searched once');
	});

	it('puts other tools last', () => {
		const sections = [call(BuiltInTool.SERVER_GET_INFO), call(BuiltInTool.SERVER_READ_FILE)];

		expect(summarizeToolCalls(sections)).toBe('Read 1 file, used 1 tool');
	});

	it('counts each tool a select query loads', () => {
		const sections = [
			call('tool_search', { query: 'select:Monitor,Notebook' }),
			call('get_weather', { city: 'x' }),
			call('get_time')
		];

		expect(summarizeToolCalls(sections)).toBe('Loaded 2 tools, used 2 tools');
	});
});

describe('describeToolActivity', () => {
	it('describes the last running call', () => {
		const sections = [
			call(BuiltInTool.SERVER_READ_FILE, { path: 'a.ts' }),
			call(
				BuiltInTool.SERVER_READ_FILE,
				{ path: 'package.json' },
				AgenticSectionType.TOOL_CALL_PENDING
			)
		];

		expect(describeToolActivity(sections, true)).toBe('Reading package.json');
	});

	it('returns null when nothing runs or the reply stopped', () => {
		const pending = [call(BuiltInTool.SERVER_READ_FILE, {}, AgenticSectionType.TOOL_CALL_PENDING)];

		expect(describeToolActivity([call(BuiltInTool.SERVER_READ_FILE)], true)).toBeNull();
		expect(describeToolActivity(pending, false)).toBeNull();
	});

	it('treats the executing call as running even once its result exists', () => {
		const sections = [
			call(
				BuiltInTool.SERVER_EXEC_SHELL_COMMAND,
				{ command: 'ls' },
				AgenticSectionType.TOOL_CALL,
				'c1'
			)
		];

		expect(describeToolActivity(sections, true, 'c1')).toBe('Running a command');
	});
});

describe('simpleToolArgFields', () => {
	it('lists short scalar args as labelled fields', () => {
		expect(
			simpleToolArgFields(JSON.stringify({ max_results: 1, query: 'select:Monitor' }))
		).toEqual([
			{ label: 'Max results', value: '1' },
			{ label: 'Query', value: 'select:Monitor' }
		]);
	});

	it('returns null for nested, multi-line, long or invalid args', () => {
		expect(simpleToolArgFields(JSON.stringify({ a: { b: 1 } }))).toBeNull();
		expect(simpleToolArgFields(JSON.stringify({ a: 'x\ny' }))).toBeNull();
		expect(simpleToolArgFields(JSON.stringify({ a: 'x'.repeat(300) }))).toBeNull();
		expect(simpleToolArgFields('{"a":')).toBeNull();
		expect(simpleToolArgFields('{}')).toBeNull();
		expect(simpleToolArgFields(undefined)).toBeNull();
	});
});

describe('humanizeArgKey', () => {
	it('turns snake and camel case into words', () => {
		expect(humanizeArgKey('max_results')).toBe('Max results');
		expect(humanizeArgKey('filePath')).toBe('File path');
		expect(humanizeArgKey('q')).toBe('Q');
	});
});

describe('groupToolCallRuns', () => {
	const text: AgenticSection = { content: 'hi', type: AgenticSectionType.TEXT };
	const tool = call(BuiltInTool.SERVER_READ_FILE);

	it('groups runs of consecutive calls and keeps single calls apart', () => {
		const sections = [text, tool, tool, tool, text, tool, text];

		expect(groupToolCallRuns(sections, [0, 1, 2, 3, 4, 5, 6], 2)).toEqual([0, [1, 2, 3], 4, 5, 6]);
	});

	it('works on a subset of indices and a trailing run', () => {
		const sections = [text, text, tool, tool];

		expect(groupToolCallRuns(sections, [1, 2, 3], 2)).toEqual([1, [2, 3]]);
	});
});
