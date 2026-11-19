import '../../src/app.css';
import NoteScreenHarness from './NoteScreenHarness.svelte';
import { EditorView } from '@codemirror/view';
import { serverStore } from '#lib/stores/llama-server.svelte.ts';
import { notesStore } from '#lib/stores/notes.svelte.ts';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';

// Real file handles, from the origin's private file system: IndexedDB keeps them and they
// write without a permission prompt, as a picked file the person allowed does
async function fileHandle(name: string, content = ''): Promise<FileSystemFileHandle> {
	const directory = await navigator.storage.getDirectory();
	const handle = await directory.getFileHandle(name, { create: true });
	const writable = await handle.createWritable();

	await writable.write(content);
	await writable.close();

	return handle;
}

async function fileText(handle: FileSystemFileHandle): Promise<string> {
	return (await handle.getFile()).text();
}

function mockServer() {
	vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
		const url = String(input);

		if (url.includes('/v1/models')) return new Response(JSON.stringify({ data: [{ id: 'a' }] }));

		if (url.includes('/props')) {
			return new Response(JSON.stringify({ default_generation_settings: { n_ctx: 100 } }));
		}

		return new Response(JSON.stringify({ tokens: [] }));
	});
}

async function openNote(content: string) {
	const note = await notesStore.create();

	notesStore.setContent(note.id, content);
	render(NoteScreenHarness, { id: note.id });

	return note;
}

beforeEach(async () => {
	mockServer();
	await serverStore.init();
});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe('Markdown files', () => {
	it('saves a note into a picked file, then back into it', async () => {
		const target = await fileHandle('story.md');
		const showSaveFilePicker = vi.fn(async () => target);

		vi.stubGlobal('showSaveFilePicker', showSaveFilePicker);

		const note = await openNote('# Story\nOnce');

		await page.getByRole('button', { name: 'Save as Markdown file' }).click();

		await expect.poll(() => fileText(target)).toBe('# Story\nOnce');
		expect(showSaveFilePicker).toHaveBeenCalledWith(
			expect.objectContaining({ suggestedName: 'Story.md' })
		);
		await expect.element(page.getByRole('button', { name: 'Save to story.md' })).toBeVisible();

		const editor = EditorView.findFromDOM(document.querySelector<HTMLElement>('.cm-content')!)!;

		editor.focus();
		editor.dispatch({ selection: { anchor: editor.state.doc.length } });
		await userEvent.keyboard(' upon');

		await expect
			.element(page.getByRole('button', { name: 'Save to story.md (unsaved changes)' }))
			.toBeVisible();

		await userEvent.keyboard('{Control>}s{/Control}');

		await expect.poll(() => fileText(target)).toBe('# Story\nOnce upon');
		expect(showSaveFilePicker).toHaveBeenCalledTimes(1);
		expect(notesStore.get(note.id)?.fileContent).toBe('# Story\nOnce upon');
		await expect.element(page.getByRole('button', { name: 'Save to story.md' })).toBeVisible();
	});

	it('downloads the note where the browser cannot save into a file', async () => {
		vi.stubGlobal('showSaveFilePicker', undefined);

		const downloads: { name: string; url: string }[] = [];
		const blobs = new Map<string, Blob>();
		const createObjectURL = URL.createObjectURL.bind(URL);

		vi.spyOn(URL, 'createObjectURL').mockImplementation((blob) => {
			const url = createObjectURL(blob);

			blobs.set(url, blob as Blob);

			return url;
		});
		vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
		vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
			this: HTMLAnchorElement
		) {
			downloads.push({ name: this.download, url: this.href });
		});

		await openNote('# Story\nOnce');
		await page.getByRole('button', { name: 'Save as Markdown file' }).click();

		await expect.poll(() => downloads.map(({ name }) => name)).toEqual(['Story.md']);
		expect(await blobs.get(downloads[0].url)?.text()).toBe('# Story\nOnce');
		await expect.element(page.getByRole('button', { name: 'Save to Story.md' })).toBeVisible();
	});

	it('opens picked files as notes', async () => {
		const picked = await fileHandle('hello.md', '﻿# Hello\r\nWorld');

		vi.stubGlobal(
			'showOpenFilePicker',
			vi.fn(async () => [picked])
		);

		const [note] = await notesStore.open();

		expect(note).toMatchObject({ content: '# Hello\nWorld', fileName: 'hello.md' });
		expect(await notesStore.saveToFile(note.id)).toBe(true);
		expect(await fileText(picked)).toBe('# Hello\nWorld');
	});

	it('opens the Markdown files among those dropped', async () => {
		const dataTransfer = new DataTransfer();

		dataTransfer.items.add(new File(['Dropped text'], 'dropped.md', { type: 'text/markdown' }));
		dataTransfer.items.add(new File(['png'], 'photo.png', { type: 'image/png' }));

		const notes = await notesStore.open(dataTransfer);

		expect(notes.map(({ content, fileName }) => ({ content, fileName }))).toEqual([
			{ content: 'Dropped text', fileName: 'dropped.md' }
		]);
	});
});
