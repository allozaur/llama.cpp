import { ContextSegment, ToolSource } from '#lib/enums/index.ts';
import {
	buildContextBreakdown,
	type ContextToolDefinition,
	type ContextToolInfo,
	formatContextShare,
	formatTokenCount
} from '#lib/utils/index.ts';
import { describe, expect, it } from 'vitest';

function tool(name: string, descriptionChars = 400): ContextToolDefinition {
	return { function: { description: 'x'.repeat(descriptionChars), name } };
}

const SOURCES: Record<string, ContextToolInfo> = {
	exec_shell_command: { source: ToolSource.SERVER },
	get_datetime: { source: ToolSource.BROWSER },
	github_create_issue: { server: 'GitHub', source: ToolSource.MCP },
	github_search: { server: 'GitHub', source: ToolSource.MCP },
	my_tool: { source: ToolSource.CUSTOM }
};
const toolInfo = (name: string): ContextToolInfo => SOURCES[name] ?? { source: null };
const messages = [
	{ content: 's'.repeat(400), role: 'system' },
	{ content: 'u'.repeat(800), role: 'user' },
	{ content: 'a'.repeat(400), reasoning_content: 'r'.repeat(400), role: 'assistant' },
	{ content: [{ text: 't'.repeat(400), type: 'text' }], role: 'tool', tool_call_id: '1' }
];

function part(breakdown: ReturnType<typeof buildContextBreakdown>, segment: ContextSegment) {
	return breakdown.parts.find((p) => p.segment === segment);
}

describe('buildContextBreakdown', () => {
	it('splits tools by source and estimates the system prompt from its characters', () => {
		const breakdown = buildContextBreakdown({
			contextTotal: 32768,
			messages,
			toolInfo,
			tools: [
				tool('exec_shell_command'),
				tool('get_datetime'),
				tool('github_search'),
				tool('my_tool')
			],
			usedTokens: null
		});

		expect(part(breakdown, ContextSegment.SYSTEM_PROMPT)?.tokens).toBe(100);
		expect(part(breakdown, ContextSegment.SYSTEM_TOOLS)?.items.map((i) => i.key)).toEqual(
			expect.arrayContaining(['exec_shell_command', 'get_datetime'])
		);
		expect(part(breakdown, ContextSegment.MCP_TOOLS)?.items).toEqual([
			expect.objectContaining({ detail: 'GitHub', label: 'github_search' })
		]);
		expect(part(breakdown, ContextSegment.CUSTOM_TOOLS)?.items).toHaveLength(1);
		expect(breakdown.usedExact).toBe(false);
	});

	it("gives the messages the rest of the server's count, so the parts add up to it", () => {
		const breakdown = buildContextBreakdown({
			contextTotal: 10000,
			messages,
			toolInfo,
			tools: [tool('exec_shell_command')],
			usedTokens: 3000
		});
		const inWindow = breakdown.parts.filter((p) => p.segment !== ContextSegment.FREE);
		const messagesPart = part(breakdown, ContextSegment.MESSAGES)!;

		expect(breakdown.usedExact).toBe(true);
		expect(breakdown.used).toBe(3000);
		expect(inWindow.reduce((sum, p) => sum + p.tokens, 0)).toBe(3000);
		expect(messagesPart.estimated).toBe(false);
		expect(messagesPart.items.reduce((sum, i) => sum + i.tokens, 0)).toBe(messagesPart.tokens);
		expect(part(breakdown, ContextSegment.FREE)?.tokens).toBe(7000);
	});

	it('lists tools loaded on demand apart, outside the window', () => {
		const breakdown = buildContextBreakdown({
			contextTotal: 10000,
			deferred: [tool('github_create_issue'), tool('my_tool')],
			messages: [],
			toolInfo,
			tools: [tool('tool_search')],
			usedTokens: null
		});

		expect(breakdown.deferred.map((p) => p.segment)).toEqual([
			ContextSegment.MCP_TOOLS,
			ContextSegment.CUSTOM_TOOLS
		]);
		expect(part(breakdown, ContextSegment.MCP_TOOLS)).toBeUndefined();
		// the search tool counts as a system tool
		expect(part(breakdown, ContextSegment.SYSTEM_TOOLS)?.items[0].key).toBe('tool_search');
	});

	it('leaves free space out while the window is unknown', () => {
		const breakdown = buildContextBreakdown({
			contextTotal: null,
			messages,
			toolInfo,
			tools: [],
			usedTokens: 500
		});

		expect(part(breakdown, ContextSegment.FREE)).toBeUndefined();
	});
});

describe('formatTokenCount', () => {
	it.each([
		[812, '812'],
		[1000, '1K'],
		[129600, '129.6K'],
		[999_960, '1M'],
		[1_000_000, '1M'],
		[1_250_000, '1.3M']
	])('%d -> %s', (tokens, expected) => {
		expect(formatTokenCount(tokens)).toBe(expected);
	});
});

describe('formatContextShare', () => {
	it('prints one decimal, a sliver and none', () => {
		expect(formatContextShare(12.345)).toBe('12.3%');
		expect(formatContextShare(0.04)).toBe('<0.1%');
		expect(formatContextShare(null)).toBe('—');
	});
});
