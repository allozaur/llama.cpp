import '../../src/app.css';
import NoteScreenHarness from './NoteScreenHarness.svelte';
import { serverStore } from '#lib/stores/llama-server.svelte.ts';
import { notesStore } from '#lib/stores/notes.svelte.ts';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';

function sse(chunk: object): string {
	return `data: ${JSON.stringify(chunk)}\n\n`;
}

let completionRequests: { model?: string; prompt: string }[] = [];

function mockServer(role?: string) {
	completionRequests = [];

	vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
		const url = String(input);

		if (url.includes('/v1/models')) {
			return new Response(JSON.stringify({ data: [{ id: 'a.gguf' }, { id: 'b.gguf' }] }));
		}

		if (url.includes('/props')) {
			return new Response(JSON.stringify({ default_generation_settings: { n_ctx: 100 }, role }));
		}

		if (url.includes('/tokenize')) {
			const { content } = JSON.parse(String(init?.body));

			return new Response(JSON.stringify({ tokens: content.split(/\s+/).filter(Boolean) }));
		}

		if (url.includes('/completion')) {
			completionRequests.push(JSON.parse(String(init?.body)));

			return new Response(
				sse({ content: ' upon' }) +
					sse({
						content: ' a time',
						stop: true,
						timings: { cache_n: 0, predicted_ms: 200, predicted_n: 2, prompt_n: 1 }
					})
			);
		}

		return new Response('{}', { status: 404 });
	});
}

async function openNote(content: string) {
	const note = await notesStore.create();

	notesStore.setContent(note.id, content);
	render(NoteScreenHarness, { id: note.id });

	return note;
}

const editorText = () => document.querySelector('.cm-content')?.textContent ?? '';

beforeEach(() => {
	localStorage.clear();
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe('NoteScreen', () => {
	it('continues the note, then undoes and redoes the generation', async () => {
		mockServer();
		await serverStore.init();

		const note = await openNote('Once');

		await expect.element(page.getByRole('button', { name: 'Undo last generation' })).toBeDisabled();

		await page.getByRole('button', { name: 'Generate' }).click();

		await expect.poll(editorText).toBe('Once upon a time');
		expect(completionRequests).toEqual([expect.objectContaining({ prompt: 'Once' })]);
		expect(completionRequests[0]).not.toHaveProperty('model');
		expect(notesStore.get(note.id)?.content).toBe('Once upon a time');
		await expect.element(page.getByTestId('stats')).toHaveTextContent('2 tokens, 10.0 t/s');
		await expect
			.element(page.getByTestId('context-gauge'))
			.toHaveAccessibleName('Context: 3 / 100 tokens (3%)');

		await page.getByRole('button', { name: 'Undo last generation' }).click();

		await expect.poll(editorText).toBe('Once');

		await page.getByRole('button', { name: 'Redo last generation' }).click();

		await expect.poll(editorText).toBe('Once upon a time');
	});

	it('generates on Shift+Enter and saves what is typed', async () => {
		mockServer();
		await serverStore.init();

		const note = await openNote('');

		await expect.element(page.getByRole('button', { name: 'Generate' })).toBeDisabled();

		await userEvent.click(document.querySelector('.cm-content')!);
		await userEvent.keyboard('Once');

		expect(notesStore.get(note.id)?.content).toBe('Once');

		await userEvent.keyboard('{Shift>}{Enter}{/Shift}');

		await expect.poll(editorText).toBe('Once upon a time');
	});

	it('counts the tokens of the note', async () => {
		mockServer();
		await serverStore.init();
		await openNote('one two three four');

		await expect
			.element(page.getByTestId('context-gauge'))
			.toHaveAccessibleName('Context: 4 / 100 tokens (4%)');
	});

	it('asks for a model on a routing server and sends the picked one', async () => {
		mockServer('router');
		await serverStore.init();
		await openNote('Once');

		await expect.element(page.getByRole('button', { name: 'Generate' })).toBeDisabled();

		await serverStore.selectModel('b.gguf');
		await page.getByRole('button', { name: 'Generate' }).click();

		await expect.poll(editorText).toBe('Once upon a time');
		expect(completionRequests[0].model).toBe('b.gguf');
	});

	it('shows why a generation failed', async () => {
		mockServer();
		await serverStore.init();

		vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) =>
			String(input).includes('/completion')
				? new Response(JSON.stringify({ error: { message: 'the model crashed' } }), { status: 500 })
				: new Response(JSON.stringify({ tokens: [] }))
		);

		await openNote('Once');
		await page.getByRole('button', { name: 'Generate' }).click();

		await expect.element(page.getByText('the model crashed')).toBeVisible();

		await page.getByRole('button', { name: 'OK' }).click();

		await expect.element(page.getByText('the model crashed')).not.toBeInTheDocument();
	});
});
