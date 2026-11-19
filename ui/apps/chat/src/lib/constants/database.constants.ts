/**
 * Database-related constants (IndexedDB).
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
	messages: 'messages',
	projects: 'projects',
	prompts: 'prompts'
} as const;

/**
 * Indexes of each store, every one keyed by `id`. Each index is named after
 * the field it covers and is neither unique nor multi-entry: the layout Dexie
 * created from its `'id, lastModified, ...'` schemas, kept so existing
 * databases open unchanged.
 */
export const IDXDB_STORE_INDEXES = {
	conversations: ['lastModified', 'currNode', 'name'],
	groups: ['updatedAt', 'name'],
	messages: ['convId', 'type', 'role', 'timestamp', 'parent', 'children'],
	projects: ['updatedAt', 'name'],
	prompts: ['lastModified', 'name']
} as const satisfies Record<keyof typeof IDXDB_TABLES, readonly string[]>;

/** Primary key path of every store */
export const IDXDB_KEY_PATH = 'id';

/**
 * IndexedDB version the database is opened at. Dexie stored its schema
 * version 4 (prompts added) as 4 * 10; a new store or index bumps this.
 */
export const IDXDB_VERSION = 40;
