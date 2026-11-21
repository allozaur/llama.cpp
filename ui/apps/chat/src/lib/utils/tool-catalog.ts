/**
 * Tools on demand: the core tools go to the model in full, the others as a
 * short list in the description of one search tool. A search, or a call to
 * a listed tool, loads the tool, and it stays loaded for the conversation so
 * the tool list only grows and the server can keep reusing its prompt cache.
 */

import type { Tool, ToolDefinition } from '@ggml-org/llama-harness';
import {
	TOOL_SEARCH_DEFAULT_LIMIT,
	TOOL_SEARCH_NAME,
	TOOL_SEARCH_SELECT_PREFIX
} from '#lib/constants/index.ts';

export interface ToolCatalog {
	/** The tools for the first request: the core ones, the loaded ones, and the search tool when any is left. */
	initialTools(): Tool[];
	/** A listed tool by name, loaded on the way. */
	resolve(name: string): Tool | undefined;
	/** Tools loaded since the last call, to append to the next request. */
	takeNewlyLoaded(): Tool[];
	/** The listed tools not loaded yet, which take no room but their line in the search tool. */
	unloaded(): Tool[];
}

interface CatalogOptions {
	core: Tool[];
	deferred: Tool[];
	/** Names loaded earlier in the conversation, kept in place. Loading adds to it. */
	loaded: Set<string>;
	/** The most characters the list of deferred tools may take in the search tool's description. */
	listBudgetChars: number;
	/** The group a deferred tool belongs to, for the short list when the full one is too long. */
	groupOf?: (tool: Tool) => string;
}

export function createToolCatalog(options: CatalogOptions): ToolCatalog {
	const { core, deferred, groupOf, listBudgetChars, loaded } = options;
	const byName = new Map(deferred.map((tool) => [toolName(tool), tool]));
	const pending: Tool[] = [];
	const load = (tool: Tool) => {
		const name = toolName(tool);

		if (loaded.has(name)) return;

		loaded.add(name);
		pending.push(tool);
	};
	const searchTool: Tool = {
		definition: searchDefinition(
			deferred.filter((tool) => !loaded.has(toolName(tool))),
			listBudgetChars,
			groupOf
		),
		execute: async (call) => {
			const query = parseQuery(call.function.arguments);
			const found = searchTools(deferred, query.text, query.limit);

			for (const tool of found) load(tool);

			if (found.length === 0) {
				return { content: `No tool matches "${query.text}". Try other words, or select:<name>.` };
			}

			return {
				content:
					`Loaded ${found.length} tool${found.length === 1 ? '' : 's'}; call ${found.length === 1 ? 'it' : 'them'} like any other tool:\n\n` +
					JSON.stringify(
						found.map((tool) => tool.definition.function),
						null,
						2
					)
			};
		}
	};

	return {
		initialTools() {
			const kept = deferred.filter((tool) => loaded.has(toolName(tool)));
			const hasMore = deferred.some((tool) => !loaded.has(toolName(tool)));

			return [...core, ...kept, ...(hasMore ? [searchTool] : [])];
		},
		resolve(name) {
			const tool = byName.get(name);

			if (tool) load(tool);

			return tool;
		},
		takeNewlyLoaded() {
			return pending.splice(0, pending.length);
		},
		unloaded() {
			return deferred.filter((tool) => !loaded.has(toolName(tool)));
		}
	};
}

/**
 * Deferred tools that match a query: `select:a,b` by exact name, anything
 * else by words found in the name (worth most), the description and the
 * parameter names.
 */
export function searchTools(
	tools: Tool[],
	query: string,
	limit = TOOL_SEARCH_DEFAULT_LIMIT
): Tool[] {
	const trimmed = query.trim();

	if (trimmed.startsWith(TOOL_SEARCH_SELECT_PREFIX)) {
		const names = trimmed
			.slice(TOOL_SEARCH_SELECT_PREFIX.length)
			.split(',')
			.map((name) => name.trim())
			.filter(Boolean);

		return names
			.map((name) => tools.find((tool) => toolName(tool) === name))
			.filter((tool): tool is Tool => !!tool);
	}

	const words = trimmed
		.toLowerCase()
		.split(/[^a-z0-9]+/)
		.filter((word) => word.length > 1);

	if (words.length === 0) return [];

	return tools
		.map((tool) => ({ score: score(tool.definition, words), tool }))
		.filter((entry) => entry.score > 0)
		.sort((a, b) => b.score - a.score)
		.slice(0, limit)
		.map((entry) => entry.tool);
}

/** About how many characters the definitions of these tools take in a request. */
export function definitionsSize(tools: Tool[]): number {
	return tools.reduce((sum, tool) => sum + JSON.stringify(tool.definition).length, 0);
}

function score(definition: ToolDefinition, words: string[]): number {
	const name = definition.function.name.toLowerCase();
	const description = (definition.function.description ?? '').toLowerCase();
	const params = Object.keys(
		(definition.function.parameters?.properties as Record<string, unknown> | undefined) ?? {}
	)
		.join(' ')
		.toLowerCase();

	return words.reduce(
		(sum, word) =>
			sum +
			(name.includes(word) ? 3 : 0) +
			(description.includes(word) ? 1 : 0) +
			(params.includes(word) ? 1 : 0),
		0
	);
}

function searchDefinition(
	listed: Tool[],
	budget: number,
	groupOf?: (tool: Tool) => string
): ToolDefinition {
	const lines = listed.map((tool) => `- ${toolName(tool)}: ${firstSentence(tool)}`);

	let list = lines.join('\n');

	// too long for the budget: one line per group instead
	if (list.length > budget && groupOf) {
		const groups = new Map<string, string[]>();

		for (const tool of listed) {
			const group = groupOf(tool);

			groups.set(group, [...(groups.get(group) ?? []), toolName(tool)]);
		}

		list = [...groups]
			.map(
				([group, names]) =>
					`- ${group}: ${names.length} tools, e.g. ${names.slice(0, 3).join(', ')}`
			)
			.join('\n');
	}

	return {
		function: {
			description:
				'Load more tools before calling them. More tools are available than are listed in this request:\n' +
				`${list}\n\n` +
				`Search with words (e.g. "create issue"), or load by name with "${TOOL_SEARCH_SELECT_PREFIX}name1,name2". ` +
				'The tools found are loaded and can be called right after.',
			name: TOOL_SEARCH_NAME,
			parameters: {
				properties: {
					limit: { description: 'How many tools to load at most.', type: 'integer' },
					query: {
						description: `Words to search for, or "${TOOL_SEARCH_SELECT_PREFIX}" and tool names.`,
						type: 'string'
					}
				},
				required: ['query'],
				type: 'object'
			}
		},
		type: 'function'
	};
}

function parseQuery(args: string): { limit?: number; text: string } {
	try {
		const parsed = JSON.parse(args || '{}') as { limit?: unknown; query?: unknown };

		return {
			limit: typeof parsed.limit === 'number' && parsed.limit > 0 ? parsed.limit : undefined,
			text: typeof parsed.query === 'string' ? parsed.query : ''
		};
	} catch {
		return { text: '' };
	}
}

function firstSentence(tool: Tool): string {
	const description = (tool.definition.function.description ?? '').replace(/\s+/g, ' ').trim();
	const end = description.search(/[.!?](\s|$)/);
	const sentence = end >= 0 ? description.slice(0, end + 1) : description;

	return sentence.length > 120 ? `${sentence.slice(0, 117)}...` : sentence || '(no description)';
}

function toolName(tool: Tool): string {
	return tool.definition.function.name;
}
