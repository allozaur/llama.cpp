// A conversation's context for the context breakdown stories: a long agentic
// chat on a 1M window, with server and MCP tools and some loaded on demand.

import { ToolSource } from '#lib/enums/index.ts';
import {
	buildContextBreakdown,
	type ContextBreakdown,
	type ContextMessage,
	type ContextToolDefinition,
	type ContextToolInfo
} from '#lib/utils/index.ts';

function tool(name: string, descriptionChars: number): ContextToolDefinition {
	return {
		function: {
			description: 'd'.repeat(descriptionChars),
			name,
			parameters: { properties: { query: { type: 'string' } }, type: 'object' }
		}
	};
}

const SYSTEM_TOOLS = [
	tool('exec_shell_command', 1400),
	tool('read_file', 900),
	tool('write_file', 800),
	tool('edit_file', 1100),
	tool('file_glob_search', 600),
	tool('get_datetime', 120),
	tool('tool_search', 1800)
];
const MCP_LOADED = [
	tool('search_issues', 1300),
	tool('create_issue', 1600),
	tool('get_pull_request', 900)
];
const MCP_DEFERRED = [
	tool('list_projects', 700),
	tool('create_project', 800),
	tool('search_docs', 1200),
	tool('query_database', 1500),
	tool('list_tables', 400)
];
const SERVERS: Record<string, string> = {
	create_issue: 'GitHub',
	create_project: 'Linear',
	get_pull_request: 'GitHub',
	list_projects: 'Linear',
	list_tables: 'Postgres',
	query_database: 'Postgres',
	search_docs: 'Docs',
	search_issues: 'GitHub'
};

export const toolInfo = (name: string): ContextToolInfo =>
	SERVERS[name]
		? { server: SERVERS[name], source: ToolSource.MCP }
		: { source: name === 'tool_search' ? null : ToolSource.SERVER };

const MESSAGES: ContextMessage[] = [
	{ content: 'You are a careful coding assistant. '.repeat(40), role: 'system' },
	{ content: 'Refactor the settings page and run the tests. '.repeat(80), role: 'user' },
	{
		content: 'Done. '.repeat(400),
		reasoning_content: 'Let me look at the files first. '.repeat(300),
		role: 'assistant',
		tool_calls: [{ function: { arguments: '{"path":"src"}', name: 'read_file' } }]
	},
	{ content: 'export const x = 1;\n'.repeat(3000), role: 'tool' }
];

export function contextBreakdown(
	options: { total?: number | null; used?: number | null; deferred?: boolean } = {}
): ContextBreakdown {
	const { deferred = true, total = 1_000_000, used = 129_600 } = options;

	return buildContextBreakdown({
		contextTotal: total,
		deferred: deferred ? MCP_DEFERRED : [],
		messages: MESSAGES,
		toolInfo,
		tools: [...SYSTEM_TOOLS, ...MCP_LOADED],
		usedTokens: used
	});
}
