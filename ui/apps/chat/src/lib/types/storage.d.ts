import type { ApiLlamaCppServerProps } from './api';
import type {
	DatabaseConversation,
	DatabaseMessage,
	DatabaseRecordKind,
	DatabaseRecords
} from './database';

/** One conversation as a storage adapter keeps it; `rev` 0 means it does not exist yet. */
export interface StoredConversation {
	rev: number;
	conv: DatabaseConversation;
	messages: DatabaseMessage[];
}

/**
 * A remote document store for conversations and user settings.
 *
 * Each conversation is one opaque document with a revision number. The store
 * does not need to understand the document, only to compare and bump `rev` on
 * write, so it maps onto a key/value store, a JSON column in Postgres or a
 * record in a NoSQL database. Settings and records (groups, projects, prompts)
 * are small and merged per key or id, last write wins. Tree rules, caching,
 * batching and conflict replay stay in the UI (DocumentStoreBackend).
 *
 * @see tools/ui/docs/storage-adapters.md - how to write and register one
 */
export interface StorageAdapter {
	/** Metadata of every stored conversation, in any order. */
	listConversations(): Promise<Pick<StoredConversation, 'rev' | 'conv'>[]>;
	/** A conversation document, or null when the store has none. */
	getConversation(id: string): Promise<StoredConversation | null>;
	/**
	 * Write a conversation document if the store still holds revision `doc.rev`
	 * (0: it must not exist yet), atomically.
	 * @returns The new revision, greater than `doc.rev`
	 * @throws StorageConflictError when the store holds another revision
	 */
	putConversation(doc: StoredConversation): Promise<number>;
	/** Delete a conversation document, a no-op when it does not exist. */
	deleteConversation(id: string): Promise<void>;

	/** All stored user settings. */
	getSettings(): Promise<Record<string, string>>;
	/** Set and remove settings per key, leaving the other keys as they are. */
	updateSettings(set: Record<string, string>, remove: string[]): Promise<void>;

	/** Every stored record of a kind (groups, projects, prompts), in any order. */
	listRecords<K extends DatabaseRecordKind>(kind: K): Promise<DatabaseRecords[K][]>;
	/** Write `set` whole and delete `remove` by id, leaving the other records as they are. */
	updateRecords<K extends DatabaseRecordKind>(
		kind: K,
		set: DatabaseRecords[K][],
		remove: string[]
	): Promise<void>;
}

/** A storage adapter offered in Settings, see STORAGE_ADAPTERS in $lib/storage-adapters. */
export interface StorageAdapterDefinition {
	/** Stable id, kept in each browser that chose this adapter */
	id: string;
	/** Short name shown in Settings, e.g. "Store on <name>" */
	name: string;
	/** What choosing it means for the user, shown in Settings */
	description: string;
	/** Whether to offer it; `props` are those of the server serving this UI */
	isAvailable(props: ApiLlamaCppServerProps | null): boolean;
	create(): StorageAdapter;
}
