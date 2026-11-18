import { countTokens } from '#lib/services/tokenize.service.ts';
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
	vi.restoreAllMocks();
});

describe('countTokens', () => {
	it('returns the number of tokens', async () => {
		const fetchMock = vi
			.spyOn(globalThis, 'fetch')
			.mockResolvedValue(new Response(JSON.stringify({ tokens: [1, 2, 3] })));

		expect(await countTokens('a b c', 'm.gguf')).toBe(3);
		expect(fetchMock.mock.calls[0][0]).toBe('./tokenize');
		expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({
			content: 'a b c',
			model: 'm.gguf'
		});
	});

	it('returns null when the server refuses', async () => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('', { status: 400 }));

		expect(await countTokens('text')).toBeNull();
	});

	it('returns null when the server is unreachable', async () => {
		vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));

		expect(await countTokens('text')).toBeNull();
	});
});
