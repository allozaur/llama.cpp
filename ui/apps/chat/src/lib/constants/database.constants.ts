/**
 * Database-related constants (IndexedDB, Dexie).
 *
 * Centralized to ensure consistency across the app and simplify future
 * naming changes.
 */

import { STORAGE_APP_NAME } from './storage.constants';

/** IndexedDB database name */
export const DB_NAME = STORAGE_APP_NAME;

/** IndexedDB store / table names */
export const IDXDB_TABLES = {
	conversations: 'conversations',
	groups: 'groups',
	memoryEntries: 'memoryEntries',
	messages: 'messages',
	prompts: 'prompts'
} as const;

/** IndexedDB store schemas */
export const IDXDB_STORE_SCHEMAS = {
	conversations: 'id, lastModified, currNode, name',
	groups: 'id, updatedAt, name',
	memoryEntries: 'name, updated',
	messages: 'id, convId, type, role, timestamp, parent, children',
	prompts: 'id, lastModified, name'
} as const;

/** Dexie stores of schema version 1 — keys are table names, values are schemas */
export const IDXDB_STORES = {
	[IDXDB_TABLES.conversations]: IDXDB_STORE_SCHEMAS.conversations,
	[IDXDB_TABLES.groups]: IDXDB_STORE_SCHEMAS.groups,
	[IDXDB_TABLES.memoryEntries]: IDXDB_STORE_SCHEMAS.memoryEntries,
	[IDXDB_TABLES.messages]: IDXDB_STORE_SCHEMAS.messages,
	[IDXDB_TABLES.prompts]: IDXDB_STORE_SCHEMAS.prompts
} as const;

/** Stores of schema version 1, before the groups table existed. */
export const IDXDB_STORES_V1 = {
	[IDXDB_TABLES.conversations]: IDXDB_STORE_SCHEMAS.conversations,
	[IDXDB_TABLES.messages]: IDXDB_STORE_SCHEMAS.messages
} as const;

/** Schema version that added the groups table. */
export const IDXDB_VERSION_GROUPS = 2;

/** Schema version that added the prompts table. */
export const IDXDB_VERSION_PROMPTS = 3;

/** Schema version new Dexie instances open the database at; bump with a new version block. */
export const IDXDB_VERSION = 4;

/** Dexie stores added by the latest schema version: the memory entries table */
export const IDXDB_STORES_MEMORY = {
	[IDXDB_TABLES.memoryEntries]: IDXDB_STORE_SCHEMAS.memoryEntries
} as const;
