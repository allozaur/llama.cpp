import { DATABASE_NAME } from '#lib/constants/index.ts';
import type { Note } from '#lib/types/notes.ts';
import Dexie, { type EntityTable } from 'dexie';

class NotesDatabase extends Dexie {
	notes!: EntityTable<Note, 'id'>;

	constructor() {
		super(DATABASE_NAME);

		this.version(1).stores({ notes: 'id, updatedAt' });
	}
}

const db = new NotesDatabase();

/** Notes kept in the browser's IndexedDB. */
export const NotesDatabaseService = {
	/** Every note, the most recently edited first. */
	all(): Promise<Note[]> {
		return db.notes.orderBy('updatedAt').reverse().toArray();
	},

	async put(note: Note): Promise<void> {
		await db.notes.put(note);
	},

	async remove(id: string): Promise<void> {
		await db.notes.delete(id);
	}
};
