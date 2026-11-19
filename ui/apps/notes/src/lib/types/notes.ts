export interface Note {
	content: string;
	createdAt: number;
	/** The text last read from or written to its Markdown file, to tell unsaved changes. */
	fileContent?: string;
	/** The Markdown file the note was opened from or saved to. */
	fileName?: string;
	id: string;
	updatedAt: number;
}

/** A Markdown file read in to become a note. */
export interface OpenedFile {
	content: string;
	/** To save back into the same file, where the browser gives one (File System Access). */
	handle?: FileSystemFileHandle;
	name: string;
}

/** What a note's generation run reports while it runs and after it. */
export interface GenerationStats {
	cacheTokens: number;
	predictedMs?: number;
	predictedTokens: number;
	promptMs?: number;
	promptProgress?: { cache: number; processed: number; time_ms: number; total: number };
	promptTokens: number;
}
