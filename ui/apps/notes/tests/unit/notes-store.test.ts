import 'fake-indexeddb/auto';
import { NotesDatabaseService } from '#lib/services/notes-database.service.ts';
import { NotesStore } from '#lib/stores/notes.svelte.ts';
import { describe, expect, it } from 'vitest';

describe('NotesStore', () => {
	it('creates, edits, saves and removes notes', async () => {
		const store = new NotesStore();

		await store.load();

		const first = await store.create();
		const second = await store.create();

		expect(store.notes.map((note) => note.id)).toEqual([second.id, first.id]);

		store.setContent(first.id, 'Hello');
		await store.flush(first.id);

		const saved = await NotesDatabaseService.all();

		expect(saved.find((note) => note.id === first.id)?.content).toBe('Hello');
		// the edited note comes first
		expect(store.notes[0].id).toBe(first.id);

		await store.remove(first.id);

		expect(store.get(first.id)).toBeUndefined();
		expect((await NotesDatabaseService.all()).map((note) => note.id)).toEqual([second.id]);
	});

	it('loads the saved notes', async () => {
		const store = new NotesStore();

		await store.load();

		expect(store.loaded).toBe(true);
		expect(store.notes).toHaveLength(1);
	});
});
