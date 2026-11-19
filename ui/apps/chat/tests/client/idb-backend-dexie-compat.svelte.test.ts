import { MessageRole } from '#lib/enums/index.ts';
import { IdbBackend, openLlamaUiDatabase } from '#lib/services/idb-backend.ts';
import { copyDeprecatedDatabase } from '#lib/services/migration.service.ts';
import { afterEach, describe, expect, it } from 'vitest';

/**
 * The on-disk layout Dexie 4.4.3 left behind, read back from a database it
 * created: IndexedDB version = Dexie version * 10, every store keyed by `id`
 * without auto-increment, every index named after its field, neither unique
 * nor multi-entry. Written out here rather than taken from the app's constants,
 * so a change to those that would strand existing data fails these tests.
 */
const DEXIE_STORES: Record<string, string[]> = {
	conversations: ['currNode', 'lastModified', 'name'],
	groups: ['name', 'updatedAt'],
	messages: ['children', 'convId', 'parent', 'role', 'timestamp', 'type'],
	projects: ['name', 'updatedAt'],
	prompts: ['lastModified', 'name']
};
/** Stores each Dexie schema version had, by IndexedDB version. */
const DEXIE_VERSIONS: Record<number, string[]> = {
	10: ['conversations', 'messages'],
	20: ['conversations', 'messages', 'groups'],
	30: ['conversations', 'messages', 'groups', 'projects'],
	40: ['conversations', 'messages', 'groups', 'projects', 'prompts']
};
const created: string[] = [];

function dbName(): string {
	const name = `compat-${crypto.randomUUID()}`;

	created.push(name);

	return name;
}

function request<T>(req: IDBRequest<T>): Promise<T> {
	return new Promise((resolve, reject) => {
		req.onsuccess = () => resolve(req.result);
		req.onerror = () => reject(req.error);
	});
}

/** Creates a database the way the Dexie build did, holding `rows` per store. */
async function createDexieDatabase(
	name: string,
	version: number,
	stores: string[],
	rows: Record<string, object[]>
): Promise<void> {
	const open = indexedDB.open(name, version);

	open.onupgradeneeded = () => {
		for (const store of stores) {
			const os = open.result.createObjectStore(store, { keyPath: 'id' });

			for (const index of DEXIE_STORES[store]) os.createIndex(index, index);
		}
	};

	const db = await request(open);
	const tx = db.transaction(stores, 'readwrite');

	for (const [store, values] of Object.entries(rows)) {
		for (const value of values) tx.objectStore(store).put(value);
	}

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

function conversation(id: string, lastModified: number, extra: object = {}): DatabaseConversation {
	return { currNode: null, id, lastModified, name: id, ...extra };
}

function message(id: string, convId: string, timestamp: number): DatabaseMessage {
	return {
		children: [],
		content: id,
		convId,
		id,
		parent: null,
		role: MessageRole.USER,
		timestamp,
		type: 'text'
	};
}

const ROWS = {
	conversations: [conversation('c1', 100), conversation('c2', 300), conversation('c3', 200)],
	messages: [
		message('m1', 'c1', 10),
		message('m2', 'c1', 20),
		message('m3', 'c2', 30),
		message('m4', 'c3', 40)
	]
};

afterEach(async () => {
	// open connections close on the delete's versionchange, see openLlamaUiDatabase
	await Promise.all(created.splice(0).map((name) => request(indexedDB.deleteDatabase(name))));
});

describe('IdbBackend on a database written by Dexie', () => {
	it('reads every row of a version 40 database and leaves its layout as it was', async () => {
		const name = dbName();
		const group = { createdAt: 1, id: 'g1', name: 'Group', updatedAt: 1 };
		const prompt = { content: 'p', id: 'p1', lastModified: 1, name: 'Prompt' };

		await createDexieDatabase(name, 40, DEXIE_VERSIONS[40], {
			...ROWS,
			groups: [group],
			prompts: [prompt]
		});

		const before = await layout(name);
		const backend = new IdbBackend(name);

		expect((await backend.listConversations()).map((c) => c.id)).toEqual(['c2', 'c3', 'c1']);
		expect((await backend.getMessages(['c1'])).map((m) => m.id)).toEqual(['m1', 'm2']);
		expect(await backend.getMessage('m3')).toEqual(ROWS.messages[2]);
		expect(await backend.listRecords('groups')).toEqual([group]);
		expect(await backend.listRecords('prompts')).toEqual([prompt]);
		expect(await backend.listRecords('projects')).toEqual([]);
		expect(await layout(name)).toEqual(before);
		expect(before.version).toBe(40);
	});

	it.each([10, 20, 30])(
		'upgrades a version %i database to 40 with the stores it lacked, keeping its rows',
		async (version) => {
			const name = dbName();

			await createDexieDatabase(name, version, DEXIE_VERSIONS[version], ROWS);

			const backend = new IdbBackend(name);

			expect((await backend.listConversations()).map((c) => c.id)).toEqual(['c2', 'c3', 'c1']);
			expect((await backend.getMessages(['c1', 'c2', 'c3'])).length).toBe(4);
			await backend.addRecord('prompts', { content: '', id: 'p', lastModified: 1, name: 'p' });

			const reference = dbName();

			await createDexieDatabase(reference, 40, DEXIE_VERSIONS[40], {});
			expect(await layout(name)).toEqual(await layout(reference));
		}
	);

	it('opens a database a newer build left at a higher version', async () => {
		const name = dbName();

		await createDexieDatabase(name, 60, [...DEXIE_VERSIONS[40]], ROWS);

		const backend = new IdbBackend(name);

		expect((await backend.listConversations()).length).toBe(3);
		expect((await layout(name)).version).toBe(60);
	});

	it('adds missing stores on top of a higher version that lacks them', async () => {
		const name = dbName();

		await createDexieDatabase(name, 60, DEXIE_VERSIONS[20], ROWS);

		const backend = new IdbBackend(name);

		expect(await backend.listRecords('prompts')).toEqual([]);
		expect((await layout(name)).version).toBe(61);
		expect((await backend.getMessages(['c2'])).map((m) => m.id)).toEqual(['m3']);
	});

	it('creates a fresh database in the layout Dexie used', async () => {
		const name = dbName();
		const reference = dbName();
		const backend = new IdbBackend(name);

		await backend.addConversation(conversation('c', 1));
		await createDexieDatabase(reference, 40, DEXIE_VERSIONS[40], {});
		expect(await layout(name)).toEqual(await layout(reference));
	});
});

describe('IdbBackend semantics Dexie provided', () => {
	it('removes a field updated to undefined and ignores updates of missing rows', async () => {
		const backend = new IdbBackend(dbName());

		await backend.addConversation(conversation('c', 1, { groupId: 'g', pinned: true }));
		await backend.updateConversation('c', { groupId: undefined, pinned: false });
		await backend.updateConversation('missing', { name: 'x' });

		const [conv, missing] = await backend.getConversations(['c', 'missing']);

		expect(conv).toEqual({ currNode: null, id: 'c', lastModified: 1, name: 'c', pinned: false });
		expect('groupId' in (conv ?? {})).toBe(false);
		expect(missing).toBeUndefined();
	});

	it('deletes conversations with their messages', async () => {
		const name = dbName();

		await createDexieDatabase(name, 40, DEXIE_VERSIONS[40], ROWS);

		const backend = new IdbBackend(name);

		await backend.deleteConversations(['c1', 'c3']);
		expect((await backend.listConversations()).map((c) => c.id)).toEqual(['c2']);
		expect((await backend.getMessages(['c1', 'c2', 'c3'])).map((m) => m.id)).toEqual(['m3']);
	});

	it('scans messages by time range, in one read', async () => {
		const name = dbName();

		await createDexieDatabase(name, 40, DEXIE_VERSIONS[40], ROWS);

		const backend = new IdbBackend(name);
		const scan = async (convIds: string[] | null, range?: { from?: number; to?: number }) => {
			const seen: string[] = [];

			await backend.scanMessages(convIds, (m) => seen.push(m.id), range);

			return seen;
		};

		expect(await scan(null)).toEqual(['m1', 'm2', 'm3', 'm4']);
		// conversations with a message in [20, 40): c1 and c2, read whole
		expect(await scan(null, { from: 20, to: 40 })).toEqual(['m1', 'm2', 'm3']);
		expect(await scan(['c2', 'c3'], { from: 30 })).toEqual(['m3', 'm4']);
		expect(await scan(null, { to: 20 })).toEqual(['m1', 'm2']);
	});

	it('rolls back every write of a failed transaction', async () => {
		const backend = new IdbBackend(dbName());

		await backend.addConversation(conversation('c', 1));
		await expect(
			backend.transaction(async (tx) => {
				await tx.updateConversation('c', { name: 'renamed' });
				await tx.addMessages([message('m', 'c', 1)]);

				throw new Error('boom');
			})
		).rejects.toThrow('boom');

		expect((await backend.getConversations(['c']))[0]?.name).toBe('c');
		expect(await backend.getMessage('m')).toBeUndefined();
	});

	it('rolls back a transaction whose write fails', async () => {
		const backend = new IdbBackend(dbName());

		await backend.addConversation(conversation('c', 1));
		await expect(
			backend.transaction(async (tx) => {
				await tx.addMessages([message('m', 'c', 1)]);
				await tx.addConversation(conversation('c', 2));
			})
		).rejects.toThrow();

		expect(await backend.getMessage('m')).toBeUndefined();
	});

	it('commits a transaction and returns its result', async () => {
		const backend = new IdbBackend(dbName());
		const result = await backend.transaction(async (tx) => {
			await tx.addConversation(conversation('c', 1));
			await tx.addMessages([message('m', 'c', 1)]);

			return (await tx.getConversations(['c']))[0]?.id;
		});

		expect(result).toBe('c');
		expect((await backend.getMessages(['c'])).length).toBe(1);
	});
});

describe('copyDeprecatedDatabase', () => {
	it('copies the old web UI database into an empty one and keeps the old', async () => {
		const from = dbName();
		const to = dbName();

		await createDexieDatabase(from, 10, DEXIE_VERSIONS[10], ROWS);
		await copyDeprecatedDatabase(from, to);

		const backend = new IdbBackend(to);

		expect((await backend.listConversations()).map((c) => c.id)).toEqual(['c2', 'c3', 'c1']);
		expect((await backend.getMessages(['c1', 'c2', 'c3'])).length).toBe(4);
		expect((await layout(from)).version).toBe(10);
		expect((await layout(to)).version).toBe(40);
	});

	it('leaves a database that already has conversations alone', async () => {
		const from = dbName();
		const to = dbName();

		await createDexieDatabase(from, 10, DEXIE_VERSIONS[10], ROWS);
		await new IdbBackend(to).addConversation(conversation('mine', 1));
		await copyDeprecatedDatabase(from, to);

		expect((await new IdbBackend(to).listConversations()).map((c) => c.id)).toEqual(['mine']);
	});

	it('does nothing, and creates no database, when there is no old one', async () => {
		const from = `missing-${crypto.randomUUID()}`;
		const to = dbName();

		await copyDeprecatedDatabase(from, to);
		expect((await indexedDB.databases()).some((info) => info.name === from)).toBe(false);
		expect((await indexedDB.databases()).some((info) => info.name === to)).toBe(false);
	});

	it('opens through openLlamaUiDatabase at the version Dexie used', async () => {
		const name = dbName();
		const db = await openLlamaUiDatabase(name);

		expect(db.version).toBe(40);
		db.close();
	});
});
