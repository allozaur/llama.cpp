/**
 * Notes kept in the browser's IndexedDB, through idb.
 *
 * The database keeps the layout Dexie 4 created (see DATABASE_STORE_INDEXES):
 * native version 10, a `notes` store keyed by `id`, an `updatedAt` index, no
 * meta store. Notes written by earlier builds open unchanged.
 */

import {
	DATABASE_KEY_PATH,
	DATABASE_NAME,
	DATABASE_STORE_INDEXES,
	DATABASE_VERSION
} from '#lib/constants/index.ts';
import type { Note } from '#lib/types/notes.ts';
import { type DBSchema, type IDBPDatabase, type IDBPTransaction, openDB } from 'idb';

interface NotesSchema extends DBSchema {
	notes: { indexes: { updatedAt: number }; key: string; value: Note };
}

type Db = IDBPDatabase<NotesSchema>;
type StoreName = keyof typeof DATABASE_STORE_INDEXES;

const STORE_NAMES = Object.keys(DATABASE_STORE_INDEXES) as StoreName[];

/** Creates whatever stores and indexes the database lacks; existing rows are left as they are. */
function applySchema(
	db: IDBPDatabase<unknown>,
	tx: IDBPTransaction<unknown, string[], 'versionchange'>
) {
	for (const name of STORE_NAMES) {
		const store = db.objectStoreNames.contains(name)
			? tx.objectStore(name)
			: db.createObjectStore(name, { keyPath: DATABASE_KEY_PATH });

		for (const index of DATABASE_STORE_INDEXES[name]) {
			if (!store.indexNames.contains(index)) store.createIndex(index, index);
		}
	}
}

function hasSchema(db: Db): boolean {
	if (!STORE_NAMES.every((name) => db.objectStoreNames.contains(name))) return false;

	const tx = db.transaction(STORE_NAMES);

	return STORE_NAMES.every((name) =>
		DATABASE_STORE_INDEXES[name].every((index) => tx.objectStore(name).indexNames.contains(index))
	);
}

function openAt(name: string, version: number | undefined, onClose: () => void): Promise<Db> {
	return openDB<NotesSchema>(name, version, {
		// another tab wants to upgrade the schema: step aside, the next call reopens
		blocking(_current, _blocked, event) {
			(event.target as IDBDatabase).close();
			onClose();
		},
		terminated: onClose,
		upgrade(db, _oldVersion, _newVersion, tx) {
			applySchema(
				db as unknown as IDBPDatabase<unknown>,
				tx as unknown as IDBPTransaction<unknown, string[], 'versionchange'>
			);
		}
	});
}

/**
 * Opens the notes database at DATABASE_VERSION, creating or upgrading its
 * stores. A database a newer build left at a higher version opens as it is,
 * and gets a version of its own on top should it lack any store or index.
 *
 * @param name - Database name, the app's own unless a test picks another
 * @param onClose - Called when the connection closes for another tab's upgrade
 */
export async function openNotesDatabase(
	name: string = DATABASE_NAME,
	onClose: () => void = () => {}
): Promise<Db> {
	let db: Db;

	try {
		db = await openAt(name, DATABASE_VERSION, onClose);
	} catch (error) {
		if ((error as DOMException | null)?.name !== 'VersionError') throw error;

		db = await openAt(name, undefined, onClose);
	}

	if (hasSchema(db)) return db;

	const version = db.version + 1;

	db.close();

	return await openAt(name, version, onClose);
}

/**
 * Notes service over the database `name`.
 *
 * @param name - Database name, the app's own unless a test picks another
 */
export function createNotesDatabaseService(name: string = DATABASE_NAME) {
	let dbPromise: Promise<Db> | null = null;

	function db(): Promise<Db> {
		dbPromise ??= openNotesDatabase(name, () => {
			dbPromise = null;
		}).catch((error) => {
			dbPromise = null;

			throw error;
		});

		return dbPromise;
	}

	return {
		/** Every note, the most recently edited first. */
		async all(): Promise<Note[]> {
			const ascending = await (await db()).getAllFromIndex('notes', 'updatedAt');

			return ascending.reverse();
		},

		async put(note: Note): Promise<void> {
			await (await db()).put('notes', note);
		},

		async remove(id: string): Promise<void> {
			await (await db()).delete('notes', id);
		}
	};
}

/** Notes kept in the browser's IndexedDB. */
export const NotesDatabaseService = createNotesDatabaseService();
