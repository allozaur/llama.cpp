import { sse, streamResponse } from './helpers.ts';
import { NoteSession } from '#lib/stores/note-session.svelte.ts';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function setup(initial = '') {
	let content = initial;

	const session = new NoteSession({
		read: () => content,
		write: (next) => {
			content = next;
		}
	});

	return { read: () => content, session };
}

function completion(...events: object[]) {
	return streamResponse(events.map(sse));
}

beforeEach(() => {
	vi.useFakeTimers();
});

afterEach(() => {
	vi.useRealTimers();
	vi.restoreAllMocks();
});

describe('NoteSession', () => {
	it('appends the generated text to the note', async () => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(
			completion({ content: ' upon' }, { content: ' a time', stop: true })
		);

		const { read, session } = setup('Once');

		await session.generate();

		expect(read()).toBe('Once upon a time');
		expect(session.isGenerating).toBe(false);
		expect(session.canUndo).toBe(true);
	});

	it('takes the token count from the timings while it generates', async () => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(
			completion({
				content: 'x',
				stop: true,
				timings: { cache_n: 2, predicted_ms: 100, predicted_n: 1, prompt_n: 4 }
			})
		);

		const { session } = setup('Once');

		await session.generate();

		expect(session.totalTokens).toBe(7);
		expect(session.stats?.predictedTokens).toBe(1);
	});

	it('undoes and redoes the last generation', async () => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(completion({ content: ' two', stop: true }));

		const { read, session } = setup('one');

		await session.generate();
		session.undo();

		expect(read()).toBe('one');
		expect(session.canUndo).toBe(false);
		expect(session.canRedo).toBe(true);

		session.redo();

		expect(read()).toBe('one two');
		expect(session.canUndo).toBe(true);
		expect(session.canRedo).toBe(false);
	});

	it('forgets the last generation once the note is edited', async () => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(completion({ content: ' two', stop: true }));

		const { session } = setup('one');

		await session.generate();
		session.edited();

		expect(session.canUndo).toBe(false);
		expect(session.canRedo).toBe(false);
	});

	it('offers no undo when nothing was generated', async () => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(completion({ stop: true }));

		const { session } = setup('one');

		await session.generate();

		expect(session.canUndo).toBe(false);
	});

	it('reports a failed generation', async () => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(
			new Response(JSON.stringify({ error: { message: 'model not found' } }), { status: 404 })
		);

		const { read, session } = setup('one');

		await session.generate();

		expect(session.error).toBe('model not found');
		expect(session.isGenerating).toBe(false);
		expect(read()).toBe('one');

		session.dismissError();

		expect(session.error).toBeNull();
	});

	it('stops a generation and keeps what it wrote', async () => {
		vi.spyOn(globalThis, 'fetch').mockImplementation(async (_input, init) => {
			const encoder = new TextEncoder();

			return new Response(
				new ReadableStream<Uint8Array>({
					start(controller) {
						controller.enqueue(encoder.encode(sse({ content: ' two' })));
						init?.signal?.addEventListener('abort', () => controller.close());
					}
				})
			);
		});

		const { read, session } = setup('one');
		const run = session.generate();

		await vi.waitFor(() => expect(read()).toBe('one two'));

		expect(session.isGenerating).toBe(true);

		session.stop();

		expect(session.isGenerating).toBe(false);

		await run;

		expect(read()).toBe('one two');
		expect(session.canUndo).toBe(true);
	});

	it('counts the tokens once the text has settled', async () => {
		const fetchMock = vi
			.spyOn(globalThis, 'fetch')
			.mockImplementation(async () => new Response(JSON.stringify({ tokens: [1, 2] })));
		const { session } = setup('one two');

		session.edited('m.gguf');
		session.edited('m.gguf');

		expect(fetchMock).not.toHaveBeenCalled();

		await vi.advanceTimersByTimeAsync(500);

		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(session.totalTokens).toBe(2);
	});

	it('counts no tokens for an empty note without asking the server', async () => {
		const fetchMock = vi.spyOn(globalThis, 'fetch');
		const { session } = setup('');

		session.scheduleTokenCount();
		await vi.advanceTimersByTimeAsync(500);

		expect(session.totalTokens).toBe(0);
		expect(fetchMock).not.toHaveBeenCalled();
	});
});
