/**
 * IdbBackend - IndexedDB (Dexie) implementation of StorageBackend
 *
 * Row-level reads and writes over the conversations/messages tables and the
 * record tables (groups, projects, prompts). Calls made inside `transaction()`
 * join the same Dexie transaction.
 */

import {
	IDXDB_STORE_SCHEMAS,
	IDXDB_STORES_V1,
	IDXDB_TABLES,
	IDXDB_VERSION_GROUPS,
	IDXDB_VERSION_PROJECTS,
	IDXDB_VERSION_PROMPTS,
	STORAGE_APP_NAME
} from '$lib/constants';
import type {
	DatabasePrompt,
	DatabaseRecordKind,
	DatabaseRecords,
	StorageBackend
} from '$lib/types/database';
import type { Group } from '$lib/types/groups';
import type { Project } from '$lib/types/projects';
import Dexie, { type EntityTable, type Table, type UpdateSpec } from 'dexie';

class LlamaUiDatabase extends Dexie {
	[IDXDB_TABLES.conversations]!: EntityTable<DatabaseConversation, string>;
	[IDXDB_TABLES.groups]!: EntityTable<Group, 'id'>;
	[IDXDB_TABLES.messages]!: EntityTable<DatabaseMessage, string>;
	[IDXDB_TABLES.projects]!: EntityTable<Project, 'id'>;
	[IDXDB_TABLES.prompts]!: EntityTable<DatabasePrompt, 'id'>;

	constructor() {
		super(STORAGE_APP_NAME);

		this.version(1).stores(IDXDB_STORES_V1);
		this.version(IDXDB_VERSION_GROUPS).stores({
			[IDXDB_TABLES.groups]: IDXDB_STORE_SCHEMAS.groups
		});
		this.version(IDXDB_VERSION_PROJECTS).stores({
			[IDXDB_TABLES.projects]: IDXDB_STORE_SCHEMAS.projects
		});
		this.version(IDXDB_VERSION_PROMPTS).stores({
			[IDXDB_TABLES.prompts]: IDXDB_STORE_SCHEMAS.prompts
		});
	}
}

/** The tables of the IndexedDB database, for reads that need its indexes. */
export type IdbTables = Pick<LlamaUiDatabase, keyof typeof IDXDB_TABLES>;

export class IdbBackend implements StorageBackend {
	private readonly db = new LlamaUiDatabase();

	private get conversations() {
		return this.db[IDXDB_TABLES.conversations];
	}

	private get messages() {
		return this.db[IDXDB_TABLES.messages];
	}

	async addConversation(conv: DatabaseConversation): Promise<void> {
		await this.conversations.add(conv);
	}

	async addMessages(messages: DatabaseMessage[]): Promise<void> {
		await this.messages.bulkAdd(messages);
	}

	async addRecord<K extends DatabaseRecordKind>(
		kind: K,
		record: DatabaseRecords[K]
	): Promise<void> {
		await this.records(kind).add(record);
	}

	async deleteConversations(ids: string[]): Promise<void> {
		await this.conversations.bulkDelete(ids);
		await this.messages.where('convId').anyOf(ids).delete();
	}

	async deleteMessages(ids: string[]): Promise<void> {
		await this.messages.bulkDelete(ids);
	}

	async deleteRecord(kind: DatabaseRecordKind, id: string): Promise<void> {
		await this.records(kind).delete(id);
	}

	async getConversations(ids: string[]): Promise<(DatabaseConversation | undefined)[]> {
		return await this.conversations.bulkGet(ids);
	}

	async getMessage(id: string): Promise<DatabaseMessage | undefined> {
		return await this.messages.get(id);
	}

	async getMessages(convIds: string[]): Promise<DatabaseMessage[]> {
		return await this.messages.where('convId').anyOf(convIds).toArray();
	}

	async listConversations(): Promise<DatabaseConversation[]> {
		return await this.conversations.orderBy('lastModified').reverse().toArray();
	}

	async listRecords<K extends DatabaseRecordKind>(kind: K): Promise<DatabaseRecords[K][]> {
		return await this.records(kind).toArray();
	}

	async putConversations(convs: DatabaseConversation[]): Promise<void> {
		await this.conversations.bulkPut(convs);
	}

	async putMessages(messages: DatabaseMessage[]): Promise<void> {
		await this.messages.bulkPut(messages);
	}

	/** Runs `fn` in a readonly transaction over the conversations and messages tables. */
	async readOnly<T>(fn: (tables: IdbTables) => Promise<T>): Promise<T> {
		return await this.db.transaction('r', [this.conversations, this.messages], () => fn(this.db));
	}

	async transaction<T>(fn: () => Promise<T>): Promise<T> {
		return await this.db.transaction(
			'rw',
			[
				this.conversations,
				this.messages,
				this.records(IDXDB_TABLES.groups),
				this.records(IDXDB_TABLES.projects),
				this.records(IDXDB_TABLES.prompts)
			],
			fn
		);
	}

	async updateConversation(
		id: string,
		updates: Partial<Omit<DatabaseConversation, 'id'>>
	): Promise<void> {
		await this.conversations.update(id, updates);
	}

	async updateMessage(id: string, updates: Partial<Omit<DatabaseMessage, 'id'>>): Promise<void> {
		await this.messages.update(id, updates);
	}

	async updateRecord<K extends DatabaseRecordKind>(
		kind: K,
		id: string,
		updates: Partial<Omit<DatabaseRecords[K], 'id'>>
	): Promise<void> {
		await this.records(kind).update(id, updates as unknown as UpdateSpec<DatabaseRecords[K]>);
	}

	private records<K extends DatabaseRecordKind>(kind: K): Table<DatabaseRecords[K], string> {
		return this.db[kind] as unknown as Table<DatabaseRecords[K], string>;
	}
}
