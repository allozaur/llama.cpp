import { DATABASE_NAME } from '#lib/constants/index.ts';
import type { Note } from '#lib/types/notes.ts';
import Dexie, { type EntityTable } from 'dexie';

/** The file a note saves back into, where the browser gives one (File System Access). */
interface NoteFileHandle {
	handle: FileSystemFileHandle;
	noteId: string;
}

class NotesDatabase extends Dexie {
	fileHandles!: EntityTable<NoteFileHandle, 'noteId'>;
	notes!: EntityTable<Note, 'id'>;

	constructor() {
		super(DATABASE_NAME);

		this.version(1).stores({ notes: 'id, updatedAt' });
		this.version(2).stores({ fileHandles: 'noteId', notes: 'id, updatedAt' });
	}
}

const db = new NotesDatabase();

/** Notes kept in the browser's IndexedDB. */
export const NotesDatabaseService = {
	/** Every note, the most recently edited first. */
	all(): Promise<Note[]> {
		return db.notes.orderBy('updatedAt').reverse().toArray();
	},

	async fileHandle(noteId: string): Promise<FileSystemFileHandle | undefined> {
		return (await db.fileHandles.get(noteId))?.handle;
	},

	async put(note: Note): Promise<void> {
		await db.notes.put(note);
	},

	async putFileHandle(noteId: string, handle: FileSystemFileHandle): Promise<void> {
		await db.fileHandles.put({ handle, noteId });
	},

	async remove(id: string): Promise<void> {
		await db.transaction('rw', db.notes, db.fileHandles, async () => {
			await db.notes.delete(id);
			await db.fileHandles.delete(id);
		});
	}
};
