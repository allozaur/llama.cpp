import 'fake-indexeddb/auto';
import { NoteFileService } from '#lib/services/note-file.service.ts';
import { NotesDatabaseService } from '#lib/services/notes-database.service.ts';
import { NotesStore } from '#lib/stores/notes.svelte.ts';
import { afterEach, describe, expect, it, vi } from 'vitest';

// a stand-in for a FileSystemFileHandle: IndexedDB keeps it as it would keep a real one
const handle = (name: string) => ({ kind: 'file', name }) as unknown as FileSystemFileHandle;

afterEach(() => {
	vi.restoreAllMocks();
});

describe('NotesStore and Markdown files', () => {
	it('opens each file as a note linked to it', async () => {
		const store = new NotesStore();

		await store.load();
		vi.spyOn(NoteFileService, 'open').mockResolvedValue([
			{ content: '# One', handle: handle('one.md'), name: 'one.md' },
			{ content: 'Two', name: 'two.txt' }
		]);

		const [one, two] = await store.open();

		expect(store.notes.map((note) => note.id)).toEqual([one.id, two.id]);
		expect(one).toMatchObject({ content: '# One', fileContent: '# One', fileName: 'one.md' });
		expect((await NotesDatabaseService.fileHandle(one.id))?.name).toBe('one.md');
		expect(await NotesDatabaseService.fileHandle(two.id)).toBeUndefined();
	});

	it('saves to a new file, then back into it', async () => {
		const store = new NotesStore();
		const note = await store.create();

		store.setContent(note.id, '# Story\nOnce');

		const save = vi
			.spyOn(NoteFileService, 'save')
			.mockResolvedValue({ handle: handle('story.md'), name: 'story.md' });

		expect(await store.saveToFile(note.id)).toBe(true);
		expect(save).toHaveBeenLastCalledWith('# Story\nOnce', {
			handle: undefined,
			name: 'Story.md',
			saveAs: false
		});
		expect(store.get(note.id)).toMatchObject({
			fileContent: '# Story\nOnce',
			fileName: 'story.md'
		});

		store.setContent(note.id, '# Story\nOnce upon');
		await store.saveToFile(note.id);

		expect(save).toHaveBeenLastCalledWith('# Story\nOnce upon', {
			handle: expect.objectContaining({ name: 'story.md' }),
			name: 'story.md',
			saveAs: false
		});

		const saved = (await NotesDatabaseService.all()).find(({ id }) => id === note.id);

		expect(saved).toMatchObject({
			content: '# Story\nOnce upon',
			fileContent: '# Story\nOnce upon'
		});
	});

	it('leaves the note as it was when saving is cancelled', async () => {
		const store = new NotesStore();
		const note = await store.create();

		vi.spyOn(NoteFileService, 'save').mockResolvedValue(null);

		expect(await store.saveToFile(note.id)).toBe(false);
		expect(store.get(note.id)?.fileName).toBeUndefined();
		expect(store.fileError).toBeNull();
	});

	it('reports why opening or saving failed', async () => {
		const store = new NotesStore();
		const note = await store.create();

		vi.spyOn(NoteFileService, 'open').mockRejectedValue(
			new Error('Choose a Markdown or text file.')
		);
		await store.open();

		expect(store.fileError).toEqual({ action: 'open', message: 'Choose a Markdown or text file.' });

		vi.spyOn(NoteFileService, 'save').mockRejectedValue(
			new Error('Llama Notes may not write a.md.')
		);
		await store.saveToFile(note.id);

		expect(store.fileError).toEqual({ action: 'save', message: 'Llama Notes may not write a.md.' });

		store.dismissFileError();

		expect(store.fileError).toBeNull();
	});

	it('forgets the file of a removed note', async () => {
		const store = new NotesStore();

		vi.spyOn(NoteFileService, 'open').mockResolvedValue([
			{ content: 'x', handle: handle('x.md'), name: 'x.md' }
		]);

		const [note] = await store.open();

		await store.remove(note.id);

		expect(await NotesDatabaseService.fileHandle(note.id)).toBeUndefined();
	});
});
