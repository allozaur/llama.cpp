import { buildMcpPromptId, isMcpPromptId, parseMcpPromptId } from '$lib/utils';
import { describe, expect, it } from 'vitest';

describe('MCP prompt ids', () => {
	it('round-trips a server and prompt name', () => {
		const id = buildMcpPromptId('github', 'review-pr');

		expect(isMcpPromptId(id)).toBe(true);
		expect(parseMcpPromptId(id)).toEqual({ promptName: 'review-pr', serverName: 'github' });
	});

	it('keeps colons in the prompt name', () => {
		expect(parseMcpPromptId(buildMcpPromptId('docs', 'search:recent'))).toEqual({
			promptName: 'search:recent',
			serverName: 'docs'
		});
	});

	it('rejects library ids and malformed MCP ids', () => {
		expect(parseMcpPromptId('6f1c2a90-library-prompt')).toBeNull();
		expect(parseMcpPromptId('mcp:')).toBeNull();
		expect(parseMcpPromptId('mcp:server-only')).toBeNull();
		expect(parseMcpPromptId('mcp::prompt')).toBeNull();
		expect(parseMcpPromptId('mcp:server:')).toBeNull();
	});
});
