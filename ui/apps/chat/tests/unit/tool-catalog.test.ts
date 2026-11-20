import type { Tool, ToolCall } from '@ggml-org/llama-harness';
import { TOOL_SEARCH_NAME } from '#lib/constants/index.ts';
import { createToolCatalog, definitionsSize, searchTools } from '#lib/utils/tool-catalog.ts';
import { describe, expect, it } from 'vitest';

function tool(name: string, description = '', params: string[] = []): Tool {
	return {
		definition: {
			function: {
				description,
				name,
				parameters: {
					properties: Object.fromEntries(params.map((p) => [p, { type: 'string' }])),
					type: 'object'
				}
			},
			type: 'function'
		},
		execute: async () => ({ content: `${name} ran` })
	};
}

const CORE = [tool('read_file', 'Read a file.')];
const DEFERRED = [
	tool('create_issue', 'Create a GitHub issue. Needs a repository.', ['title', 'body']),
	tool('list_issues', 'List the issues of a repository.', ['state']),
	tool('send_message', 'Send a Slack message to a channel.', ['channel', 'text'])
];

function call(args: object): ToolCall {
	return {
		function: { arguments: JSON.stringify(args), name: TOOL_SEARCH_NAME },
		id: 'c1',
		type: 'function'
	};
}

function names(tools: Tool[]): string[] {
	return tools.map((t) => t.definition.function.name);
}

function search(catalog: ReturnType<typeof createToolCatalog>) {
	const searchTool = catalog
		.initialTools()
		.find((t) => t.definition.function.name === TOOL_SEARCH_NAME)!;

	return (args: object) => searchTool.execute(call(args), { update: () => {} });
}

describe('searchTools', () => {
	it('ranks by words in the name first, then the description and parameters', () => {
		expect(names(searchTools(DEFERRED, 'issue'))).toEqual(['create_issue', 'list_issues']);
		expect(names(searchTools(DEFERRED, 'slack channel'))).toEqual(['send_message']);
		expect(searchTools(DEFERRED, 'weather')).toEqual([]);
	});

	it('loads by exact name with select:', () => {
		expect(names(searchTools(DEFERRED, 'select:send_message, list_issues, nope'))).toEqual([
			'send_message',
			'list_issues'
		]);
	});
});

describe('createToolCatalog', () => {
	it('sends the core tools and a search tool that lists the others', () => {
		const catalog = createToolCatalog({
			core: CORE,
			deferred: DEFERRED,
			listBudgetChars: 10_000,
			loaded: new Set()
		});
		const tools = catalog.initialTools();
		const description = tools[1].definition.function.description!;

		expect(names(tools)).toEqual(['read_file', TOOL_SEARCH_NAME]);
		expect(description).toContain('- create_issue: Create a GitHub issue.');
		expect(description).not.toContain('Needs a repository');
	});

	it('lists one line per group when the full list is over budget', () => {
		const catalog = createToolCatalog({
			core: CORE,
			deferred: DEFERRED,
			groupOf: (t) => (t.definition.function.name.includes('issue') ? 'GitHub' : 'Slack'),
			listBudgetChars: 20,
			loaded: new Set()
		});
		const description = catalog.initialTools()[1].definition.function.description!;

		expect(description).toContain('- GitHub: 2 tools, e.g. create_issue, list_issues');
		expect(description).toContain('- Slack: 1 tools, e.g. send_message');
	});

	it('loads what a search finds, once, and hands it over for the next request', async () => {
		const loaded = new Set<string>();
		const catalog = createToolCatalog({
			core: CORE,
			deferred: DEFERRED,
			listBudgetChars: 10_000,
			loaded
		});
		const result = await search(catalog)({ limit: 1, query: 'issue' });

		expect(result.content).toContain('"name": "create_issue"');
		expect(names(catalog.takeNewlyLoaded())).toEqual(['create_issue']);
		expect(catalog.takeNewlyLoaded()).toEqual([]);

		await search(catalog)({ query: 'select:create_issue' });

		expect(catalog.takeNewlyLoaded()).toEqual([]);
		expect([...loaded]).toEqual(['create_issue']);
	});

	it('loads a listed tool the model calls without searching', () => {
		const catalog = createToolCatalog({
			core: CORE,
			deferred: DEFERRED,
			listBudgetChars: 10_000,
			loaded: new Set()
		});

		expect(catalog.resolve('send_message')?.definition.function.name).toBe('send_message');
		expect(catalog.resolve('nope')).toBeUndefined();
		expect(names(catalog.takeNewlyLoaded())).toEqual(['send_message']);
	});

	it('keeps tools loaded earlier in the conversation, and drops the search tool once all are loaded', () => {
		const some = createToolCatalog({
			core: CORE,
			deferred: DEFERRED,
			listBudgetChars: 10_000,
			loaded: new Set(['list_issues'])
		});

		expect(names(some.initialTools())).toEqual(['read_file', 'list_issues', TOOL_SEARCH_NAME]);
		expect(some.initialTools()[2].definition.function.description).not.toContain('list_issues');

		const all = createToolCatalog({
			core: CORE,
			deferred: DEFERRED,
			listBudgetChars: 10_000,
			loaded: new Set(names(DEFERRED))
		});

		expect(names(all.initialTools())).toEqual(['read_file', ...names(DEFERRED)]);
	});

	it('says so when nothing matches', async () => {
		const catalog = createToolCatalog({
			core: CORE,
			deferred: DEFERRED,
			listBudgetChars: 10_000,
			loaded: new Set()
		});

		expect((await search(catalog)({ query: 'weather' })).content).toContain('No tool matches');
	});
});

describe('definitionsSize', () => {
	it('measures the definitions as sent', () => {
		expect(definitionsSize(CORE)).toBe(JSON.stringify(CORE[0].definition).length);
	});
});
