export const API = {
	COMPLETION: './completion',
	MODELS: './v1/models',
	PROPS: './props',
	TOKENIZE: './tokenize'
} as const;

/** llama-server's role when it routes between several models. */
export const SERVER_ROLE_ROUTER = 'router';

export const DATABASE_NAME = 'LlamaNotes';

export const STORAGE_KEYS = {
	SELECTED_MODEL: 'LlamaNotes.selectedModel'
} as const;

/** What a note opens from and saves to. */
export const MARKDOWN_FILE = {
	EXTENSION: '.md',
	MIME_TYPE: 'text/markdown',
	/** Extensions read in as notes, besides any `text/*` file. */
	OPENABLE_EXTENSIONS: ['.md', '.markdown', '.txt'],
	PICKER_TYPES: [
		{
			accept: { 'text/markdown': ['.md', '.markdown'], 'text/plain': ['.txt'] },
			description: 'Markdown'
		}
	]
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
