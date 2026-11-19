/**
 * IdbBackend - IndexedDB (idb) implementation of StorageBackend
 *
 * Row-level reads and writes over the conversations/messages tables and the
 * record tables (groups, projects, prompts). `transaction()` hands its callback
 * a backend bound to one IndexedDB transaction; every other call runs in a
 * transaction of its own.
 *
 * The database keeps the layout Dexie created (see IDXDB_STORE_INDEXES), so
 * data written by earlier builds opens unchanged.
 */

import {
	DB_NAME,
	IDXDB_KEY_PATH,
	IDXDB_STORE_INDEXES,
	IDXDB_TABLES,
	IDXDB_VERSION
} from '#lib/constants/index.ts';
import type {
	DatabasePrompt,
	DatabaseRecordKind,
	DatabaseRecords,
	MessageTimeRange,
	StorageBackend
} from '#lib/types/database.js';
import type { Group } from '#lib/types/groups.js';
import type { Project } from '#lib/types/projects.js';
import {
	type DBSchema,
	type IDBPDatabase,
	type IDBPTransaction,
	openDB,
	type StoreNames
} from 'idb';

interface LlamaUiSchema extends DBSchema {
	[IDXDB_TABLES.conversations]: {
		indexes: { lastModified: number };
		key: string;
		value: DatabaseConversation;
	};
	[IDXDB_TABLES.groups]: { key: string; value: Group };
	[IDXDB_TABLES.messages]: {
		indexes: { convId: string; timestamp: number };
		key: string;
		value: DatabaseMessage;
	};
	[IDXDB_TABLES.projects]: { key: string; value: Project };
	[IDXDB_TABLES.prompts]: { key: string; value: DatabasePrompt };
}

type StoreName = StoreNames<LlamaUiSchema>;
type Db = IDBPDatabase<LlamaUiSchema>;
/** Typed as read-write so writes type-check; read-only calls only read. */
type Tx = IDBPTransaction<LlamaUiSchema, StoreName[], 'readwrite'>;

/** The record stores (groups, projects, prompts) share one shape, typed by kind. */
interface RecordStore<V> {
	add(value: V): Promise<unknown>;
	delete(id: string): Promise<void>;
	getAll(): Promise<V[]>;
}

const STORE_NAMES = Object.values(IDXDB_TABLES);

/** Creates whatever stores and indexes the database lacks; existing rows are left as they are. */
function applySchema(
	db: IDBPDatabase<unknown>,
	tx: IDBPTransaction<unknown, string[], 'versionchange'>
) {
	for (const name of STORE_NAMES) {
		const store = db.objectStoreNames.contains(name)
			? tx.objectStore(name)
			: db.createObjectStore(name, { keyPath: IDXDB_KEY_PATH });

		for (const index of IDXDB_STORE_INDEXES[name] as readonly string[]) {
			if (!store.indexNames.contains(index)) store.createIndex(index, index);
		}
	}
}

function hasSchema(db: Db): boolean {
	if (!STORE_NAMES.every((name) => db.objectStoreNames.contains(name))) return false;

	// index names are not part of the typed schema, so read them off the native transaction
	const tx = db.transaction(STORE_NAMES) as unknown as IDBPTransaction<
		unknown,
		string[],
		'readonly'
	>;

	return STORE_NAMES.every((name) =>
		(IDXDB_STORE_INDEXES[name] as readonly string[]).every((index) =>
			tx.objectStore(name).indexNames.contains(index)
		)
	);
}

function openAt(name: string, version: number | undefined, onClose: () => void): Promise<Db> {
	return openDB<LlamaUiSchema>(name, version, {
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
 * Opens the app database at IDXDB_VERSION, creating or upgrading its stores.
 * A database a newer build left at a higher version opens as it is, and gets
 * a version of its own on top should it lack any store or index.
 *
 * @param name - Database name, the app's own unless a test picks another
 * @param onClose - Called when the connection closes for another tab's upgrade
 */
export async function openLlamaUiDatabase(
	name: string = DB_NAME,
	onClose: () => void = () => {}
): Promise<Db> {
	let db: Db;

	try {
		db = await openAt(name, IDXDB_VERSION, onClose);
	} catch (error) {
		if ((error as DOMException | null)?.name !== 'VersionError') throw error;

		db = await openAt(name, undefined, onClose);
	}

	if (hasSchema(db)) return db;

	const version = db.version + 1;

	db.close();

	return await openAt(name, version, onClose);
}

/** Dexie-style shallow merge: an `undefined` value removes the field. */
function merge<T extends object>(row: T, updates: Partial<T>): T {
	const next = { ...row } as Record<string, unknown>;

	for (const [key, value] of Object.entries(updates)) {
		if (value === undefined) delete next[key];
		else next[key] = value;
	}

	return next as T;
}

/** Messages of `convIds`, ordered by conversation id then message id, each id once. */
async function messagesOf(
	tx: Tx,
	convIds: string[],
	visit: (message: DatabaseMessage) => void
): Promise<void> {
	const index = tx.objectStore(IDXDB_TABLES.messages).index('convId');

	for (const convId of [...new Set(convIds)].sort()) {
		let cursor = await index.openCursor(convId);

		while (cursor) {
			visit(cursor.value);
			cursor = await cursor.continue();
		}
	}
}

function timeRange({ from, to }: MessageTimeRange): IDBKeyRange {
	if (from !== undefined && to !== undefined) return IDBKeyRange.bound(from, to, false, true);

	return from !== undefined ? IDBKeyRange.lowerBound(from) : IDBKeyRange.upperBound(to, true);
}

export class IdbBackend implements StorageBackend {
	private dbPromise: Promise<Db> | null = null;

	async addConversation(conv: DatabaseConversation): Promise<void> {
		await this.run([IDXDB_TABLES.conversations], 'readwrite', async (tx) => {
			await tx.objectStore(IDXDB_TABLES.conversations).add(conv);
		});
	}

	async addMessages(messages: DatabaseMessage[]): Promise<void> {
		await this.run([IDXDB_TABLES.messages], 'readwrite', async (tx) => {
			const store = tx.objectStore(IDXDB_TABLES.messages);

			await Promise.all(messages.map((message) => store.add(message)));
		});
	}

	async addRecord<K extends DatabaseRecordKind>(
		kind: K,
		record: DatabaseRecords[K]
	): Promise<void> {
		await this.run([kind], 'readwrite', async (tx) => {
			await this.records(tx, kind).add(record);
		});
	}

	/**
	 * @param name - Database name, the app's own unless a test picks another
	 * @param scope - The transaction every call joins; a backend without one
	 * opens a transaction per call
	 */
	constructor(
		private readonly name: string = DB_NAME,
		private readonly scope: Tx | null = null
	) {}

	async deleteConversations(ids: string[]): Promise<void> {
		await this.run([IDXDB_TABLES.conversations, IDXDB_TABLES.messages], 'readwrite', async (tx) => {
			const conversations = tx.objectStore(IDXDB_TABLES.conversations);
			const messages = tx.objectStore(IDXDB_TABLES.messages);
			const messageIds: string[] = [];

			await Promise.all(ids.map((id) => conversations.delete(id)));
			await messagesOf(tx, ids, (message) => messageIds.push(message.id));
			await Promise.all(messageIds.map((id) => messages.delete(id)));
		});
	}

	async deleteMessages(ids: string[]): Promise<void> {
		await this.run([IDXDB_TABLES.messages], 'readwrite', async (tx) => {
			const store = tx.objectStore(IDXDB_TABLES.messages);

			await Promise.all(ids.map((id) => store.delete(id)));
		});
	}

	async deleteRecord(kind: DatabaseRecordKind, id: string): Promise<void> {
		await this.run([kind], 'readwrite', async (tx) => {
			await this.records(tx, kind).delete(id);
		});
	}

	async getConversations(ids: string[]): Promise<(DatabaseConversation | undefined)[]> {
		return await this.run([IDXDB_TABLES.conversations], 'readonly', async (tx) => {
			const store = tx.objectStore(IDXDB_TABLES.conversations);

			return await Promise.all(ids.map((id) => store.get(id)));
		});
	}

	async getMessage(id: string): Promise<DatabaseMessage | undefined> {
		return await this.run([IDXDB_TABLES.messages], 'readonly', async (tx) => {
			return await tx.objectStore(IDXDB_TABLES.messages).get(id);
		});
	}

	async getMessages(convIds: string[]): Promise<DatabaseMessage[]> {
		return await this.run([IDXDB_TABLES.messages], 'readonly', async (tx) => {
			const found: DatabaseMessage[] = [];

			await messagesOf(tx, convIds, (message) => found.push(message));

			return found;
		});
	}

	async listConversations(): Promise<DatabaseConversation[]> {
		return await this.run([IDXDB_TABLES.conversations], 'readonly', async (tx) => {
			const ascending = await tx
				.objectStore(IDXDB_TABLES.conversations)
				.index('lastModified')
				.getAll();

			return ascending.reverse();
		});
	}

	async listRecords<K extends DatabaseRecordKind>(kind: K): Promise<DatabaseRecords[K][]> {
		return await this.run([kind], 'readonly', async (tx) => {
			return await this.records(tx, kind).getAll();
		});
	}

	async putConversations(convs: DatabaseConversation[]): Promise<void> {
		await this.run([IDXDB_TABLES.conversations], 'readwrite', async (tx) => {
			const store = tx.objectStore(IDXDB_TABLES.conversations);

			await Promise.all(convs.map((conv) => store.put(conv)));
		});
	}

	async putMessages(messages: DatabaseMessage[]): Promise<void> {
		await this.run([IDXDB_TABLES.messages], 'readwrite', async (tx) => {
			const store = tx.objectStore(IDXDB_TABLES.messages);

			await Promise.all(messages.map((message) => store.put(message)));
		});
	}

	async scanMessages(
		convIds: string[] | null,
		visit: (message: DatabaseMessage) => void,
		range?: MessageTimeRange
	): Promise<void> {
		// one transaction, so the range lookup and the read see the same data
		await this.run([IDXDB_TABLES.messages], 'readonly', async (tx) => {
			let ids = convIds;

			if (range) {
				const active = new Set<string>();

				let cursor = await tx
					.objectStore(IDXDB_TABLES.messages)
					.index('timestamp')
					.openCursor(timeRange(range));

				while (cursor) {
					active.add(cursor.value.convId);
					cursor = await cursor.continue();
				}

				ids = ids ? ids.filter((id) => active.has(id)) : [...active];
			}

			if (ids) {
				await messagesOf(tx, ids, visit);

				return;
			}

			let cursor = await tx.objectStore(IDXDB_TABLES.messages).openCursor();

			while (cursor) {
				visit(cursor.value);
				cursor = await cursor.continue();
			}
		});
	}

	async transaction<T>(fn: (tx: StorageBackend) => Promise<T>): Promise<T> {
		if (this.scope) return await fn(this);

		const tx = (await this.db()).transaction(STORE_NAMES, 'readwrite');

		try {
			const result = await fn(new IdbBackend(this.name, tx));

			await tx.done;

			return result;
		} catch (error) {
			try {
				tx.abort();
			} catch {
				// already committed or aborted by the failed request
			}

			tx.done.catch(() => {});

			throw error;
		}
	}

	async updateConversation(
		id: string,
		updates: Partial<Omit<DatabaseConversation, 'id'>>
	): Promise<void> {
		await this.update(IDXDB_TABLES.conversations, id, updates);
	}

	async updateMessage(id: string, updates: Partial<Omit<DatabaseMessage, 'id'>>): Promise<void> {
		await this.update(IDXDB_TABLES.messages, id, updates);
	}

	async updateRecord<K extends DatabaseRecordKind>(
		kind: K,
		id: string,
		updates: Partial<Omit<DatabaseRecords[K], 'id'>>
	): Promise<void> {
		await this.update(kind, id, updates as Partial<DatabaseRecords[K]>);
	}

	private db(): Promise<Db> {
		this.dbPromise ??= openLlamaUiDatabase(this.name, () => {
			this.dbPromise = null;
		}).catch((error) => {
			this.dbPromise = null;

			throw error;
		});

		return this.dbPromise;
	}

	private records<K extends DatabaseRecordKind>(tx: Tx, kind: K): RecordStore<DatabaseRecords[K]> {
		return tx.objectStore(kind) as unknown as RecordStore<DatabaseRecords[K]>;
	}

	/** Runs `body` in the scoped transaction, or in a new one over `stores`. */
	private async run<T>(
		stores: StoreName[],
		mode: IDBTransactionMode,
		body: (tx: Tx) => Promise<T>
	): Promise<T> {
		if (this.scope) return await body(this.scope);

		const tx = (await this.db()).transaction(stores, mode) as Tx;
		const [result] = await Promise.all([body(tx), tx.done]);

		return result;
	}

	private async update<T extends object>(
		store: StoreName,
		id: string,
		updates: Partial<T>
	): Promise<void> {
		await this.run([store], 'readwrite', async (tx) => {
			const table = tx.objectStore(store);
			const row = (await table.get(id)) as T | undefined;

			if (row) await table.put(merge(row, updates) as never);
		});
	}
}
