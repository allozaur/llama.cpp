export const API = {
	COMPLETION: './completion',
	MODELS: './v1/models',
	PROPS: './props',
	TOKENIZE: './tokenize'
} as const;

/** llama-server's role when it routes between several models. */
export const SERVER_ROLE_ROUTER = 'router';

export const DATABASE_NAME = 'LlamaNotes';
/**
 * Native IndexedDB version of the notes database. Dexie 4 created it at its
 * schema version 1 and stored it as 1 * 10, so later builds open it at 10.
 */
export const DATABASE_VERSION = 10;
export const DATABASE_KEY_PATH = 'id';
/** Indexes of each store, each named after its field, as Dexie created them. */
export const DATABASE_STORE_INDEXES = {
	notes: ['updatedAt']
} as const;

export const STORAGE_KEYS = {
	SELECTED_MODEL: 'LlamaNotes.selectedModel'
} as const;

/** Title of a note with no text yet. */
export const UNTITLED_NOTE = 'Untitled note';
export const NOTE_TITLE_MAX_LENGTH = 80;

/** Wait after the last edit before a note is saved or its tokens are counted. */
export const SAVE_DEBOUNCE_MS = 300;
export const TOKENIZE_DEBOUNCE_MS = 500;

export const AUTO_SCROLL_INTERVAL_MS = 100;
export const AUTO_SCROLL_AT_BOTTOM_THRESHOLD = 10;

export const TOOLTIP_DELAY_MS = 300;
