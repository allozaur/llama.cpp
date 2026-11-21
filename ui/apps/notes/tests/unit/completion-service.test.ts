import { sse, streamResponse } from './helpers.ts';
import { readCompletionStream, streamCompletion } from '#lib/services/completion.service.ts';
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
	vi.restoreAllMocks();
});

describe('readCompletionStream', () => {
	it('reports text, timings and the final event', async () => {
		const chunks: string[] = [];
		const onTimings = vi.fn();
		const stopped = await readCompletionStream(
			streamResponse([
				sse({ prompt_progress: { cache: 0, processed: 2, time_ms: 5, total: 4 } }),
				sse({ content: 'Hello', timings: { predicted_n: 1 } }),
				sse({ content: ' world', stop: true, timings: { predicted_n: 2 } })
			]),
			{ onChunk: (text) => chunks.push(text), onTimings }
		);

		expect(stopped).toBe(true);
		expect(chunks).toEqual(['Hello', ' world']);
		expect(onTimings).toHaveBeenCalledTimes(3);
		expect(onTimings).toHaveBeenNthCalledWith(1, undefined, {
			cache: 0,
			processed: 2,
			time_ms: 5,
			total: 4
		});
	});

	it('joins an event split across network chunks', async () => {
		const event = sse({ content: 'split' });
		const chunks: string[] = [];

		await readCompletionStream(streamResponse([event.slice(0, 9), event.slice(9)]), {
			onChunk: (text) => chunks.push(text)
		});

		expect(chunks).toEqual(['split']);
	});

	it('skips an event that is not JSON', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});

		const chunks: string[] = [];

		await readCompletionStream(streamResponse(['data: {broken\n\n', sse({ content: 'ok' })]), {
			onChunk: (text) => chunks.push(text)
		});

		expect(chunks).toEqual(['ok']);
	});

	it('returns false when the stream ends without a final event', async () => {
		expect(await readCompletionStream(streamResponse([sse({ content: 'a' })]), {})).toBe(false);
	});
});

describe('streamCompletion', () => {
	it('posts the prompt as a streamed raw completion', async () => {
		const fetchMock = vi
			.spyOn(globalThis, 'fetch')
			.mockResolvedValue(streamResponse([sse({ content: 'x', stop: true })]));

		await streamCompletion('Once upon', { model: 'm.gguf' });

		const [url, init] = fetchMock.mock.calls[0];

		expect(url).toBe('./completion');
		expect(JSON.parse(String(init?.body))).toEqual({
			cache_prompt: true,
			model: 'm.gguf',
			prompt: 'Once upon',
			return_progress: true,
			stream: true,
			timings_per_token: true
		});
	});

	it('sends no model when none is given', async () => {
		const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(streamResponse([]));

		await streamCompletion('text');

		expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).not.toHaveProperty('model');
	});

	it("throws the server's error message", async () => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(
			new Response(JSON.stringify({ error: { message: 'context too long' } }), { status: 400 })
		);

		await expect(streamCompletion('text')).rejects.toThrow('context too long');
	});

	it('falls back to the status when the error has no message', async () => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(
			new Response('oops', { status: 500, statusText: 'Internal Server Error' })
		);

		await expect(streamCompletion('text')).rejects.toThrow('500');
	});

	it('explains a failed connection', async () => {
		vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));

		await expect(streamCompletion('text')).rejects.toThrow('Unable to connect');
	});

	it('resolves when the request is aborted', async () => {
		const controller = new AbortController();

		vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
			controller.abort();

			throw new DOMException('aborted', 'AbortError');
		});

		await expect(streamCompletion('text', { signal: controller.signal })).resolves.toBeUndefined();
	});
});
