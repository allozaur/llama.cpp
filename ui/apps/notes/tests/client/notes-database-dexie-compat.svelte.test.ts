import {
	createNotesDatabaseService,
	openNotesDatabase
} from '#lib/services/notes-database.service.ts';
import type { Note } from '#lib/types/notes.ts';
import { afterEach, describe, expect, it } from 'vitest';

/**
 * The on-disk layout Dexie 4.4.3 left behind for `this.version(1).stores({
 * notes: 'id, updatedAt' })`: IndexedDB version 1 * 10, the store keyed by
 * `id` without auto-increment, an index named after its field, neither unique
 * nor multi-entry. Written out here rather than taken from the app's
 * constants, so a change to those that would strand existing notes fails
 * these tests.
 */
const DEXIE_VERSION = 10;
const DEXIE_LAYOUT = {
	notes: {
		autoIncrement: false,
		indexes: [['updatedAt', 'updatedAt', false, false]],
		keyPath: 'id'
	}
};
const created: string[] = [];

function dbName(): string {
	const name = `notes-compat-${crypto.randomUUID()}`;

	created.push(name);

	return name;
}

function request<T>(req: IDBRequest<T>): Promise<T> {
	return new Promise((resolve, reject) => {
		req.onsuccess = () => resolve(req.result);
		req.onerror = () => reject(req.error);
	});
}

/** Creates a database the way the Dexie build did, holding `notes`. */
async function createDexieDatabase(name: string, notes: Note[]): Promise<void> {
	const open = indexedDB.open(name, DEXIE_VERSION);

	open.onupgradeneeded = () => {
		open.result.createObjectStore('notes', { keyPath: 'id' }).createIndex('updatedAt', 'updatedAt');
	};

	const db = await request(open);
	const tx = db.transaction('notes', 'readwrite');

	for (const note of notes) tx.objectStore('notes').put(note);

	await new Promise<void>((resolve, reject) => {
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error);
	});
	db.close();
}

/** Version and store/index layout of a database, read with plain IndexedDB. */
async function layout(name: string) {
	const db = await request(indexedDB.open(name));
	const names = [...db.objectStoreNames].sort();
	const tx = db.transaction(names);
	const stores = Object.fromEntries(
		names.map((store) => {
			const os = tx.objectStore(store);

			return [
				store,
				{
					autoIncrement: os.autoIncrement,
					indexes: [...os.indexNames].map((index) => {
						const ix = os.index(index);

						return [index, ix.keyPath, ix.unique, ix.multiEntry];
					}),
					keyPath: os.keyPath
				}
			];
		})
	);
	const version = db.version;

	db.close();

	return { stores, version };
}

function note(id: string, updatedAt: number): Note {
	return { content: `text of ${id}`, createdAt: 1, id, updatedAt };
}

const NOTES = [note('a', 100), note('b', 300), note('c', 200)];

afterEach(async () => {
	// open connections close on the delete's versionchange, see openNotesDatabase
	await Promise.all(created.splice(0).map((name) => request(indexedDB.deleteDatabase(name))));
});

describe('notes database written by Dexie', () => {
	it('reads every note, newest first, and leaves the layout as it was', async () => {
		const name = dbName();

		await createDexieDatabase(name, NOTES);

		const service = createNotesDatabaseService(name);

		expect((await service.all()).map((n) => n.id)).toEqual(['b', 'c', 'a']);
		expect((await service.all())[0]).toEqual(note('b', 300));

		await service.put(note('d', 400));
		await service.remove('a');

		expect((await service.all()).map((n) => n.id)).toEqual(['d', 'b', 'c']);
		(await openNotesDatabase(name)).close();
		expect(await layout(name)).toEqual({ stores: DEXIE_LAYOUT, version: DEXIE_VERSION });
	});

	it('creates a new database in the same layout Dexie did', async () => {
		const name = dbName();

		(await openNotesDatabase(name)).close();

		expect(await layout(name)).toEqual({ stores: DEXIE_LAYOUT, version: DEXIE_VERSION });
	});

	it('opens a database a newer build left at a higher version as it is', async () => {
		const name = dbName();
		const open = indexedDB.open(name, DEXIE_VERSION + 10);

		open.onupgradeneeded = () => {
			open.result
				.createObjectStore('notes', { keyPath: 'id' })
				.createIndex('updatedAt', 'updatedAt');
		};
		(await request(open)).close();

		const db = await openNotesDatabase(name);

		expect(db.version).toBe(DEXIE_VERSION + 10);
		db.close();
	});

	it('adds a missing index on a version of its own, keeping the notes', async () => {
		const name = dbName();
		const open = indexedDB.open(name, DEXIE_VERSION);

		open.onupgradeneeded = () => {
			open.result.createObjectStore('notes', { keyPath: 'id' });
		};

		const raw = await request(open);

		await request(raw.transaction('notes', 'readwrite').objectStore('notes').put(note('a', 1)));
		raw.close();

		const service = createNotesDatabaseService(name);

		expect((await service.all()).map((n) => n.id)).toEqual(['a']);
		expect(await layout(name)).toEqual({ stores: DEXIE_LAYOUT, version: DEXIE_VERSION + 1 });
	});

	it('tells a layout Dexie did not write apart from one it did', async () => {
		// guards the guard: a wrong version or a missing index must not pass for Dexie's layout
		const wrongVersion = dbName();
		const missingIndex = dbName();
		const v = indexedDB.open(wrongVersion, 1);

		v.onupgradeneeded = () => {
			v.result.createObjectStore('notes', { keyPath: 'id' }).createIndex('updatedAt', 'updatedAt');
		};
		(await request(v)).close();

		const m = indexedDB.open(missingIndex, DEXIE_VERSION);

		m.onupgradeneeded = () => {
			m.result.createObjectStore('notes', { keyPath: 'id' });
		};
		(await request(m)).close();

		expect(await layout(wrongVersion)).not.toEqual({
			stores: DEXIE_LAYOUT,
			version: DEXIE_VERSION
		});
		expect(await layout(missingIndex)).not.toEqual({
			stores: DEXIE_LAYOUT,
			version: DEXIE_VERSION
		});
	});
});
