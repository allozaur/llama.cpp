import { SAVE_DEBOUNCE_MS } from '#lib/constants/index.ts';
import { NoteFileService } from '#lib/services/note-file.service.ts';
import { NotesDatabaseService } from '#lib/services/notes-database.service.ts';
import type { Note, OpenedFile } from '#lib/types/notes.ts';
import { markdownFileName } from '#lib/utils/markdown-file.ts';

function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

/** The notes kept in this browser, the most recently edited first. */
export class NotesStore {
	/** Why opening or saving a Markdown file failed, until the person dismisses it. */
	fileError = $state<{ action: 'open' | 'save'; message: string } | null>(null);
	loaded = $state(false);
	notes = $state<Note[]>([]);

	// timers only: nothing reads them reactively
	// eslint-disable-next-line svelte/prefer-svelte-reactivity
	private saveTimers = new Map<string, ReturnType<typeof setTimeout>>();

	async create(): Promise<Note> {
		const now = Date.now();
		const note: Note = { content: '', createdAt: now, id: crypto.randomUUID(), updatedAt: now };

		this.notes.unshift(note);
		await NotesDatabaseService.put(note);

		return note;
	}

	/** A note for each file, linked to it, so saving writes back into it; the first file first. */
	async createFromFiles(files: OpenedFile[]): Promise<Note[]> {
		const now = Date.now();
		const notes = files.map(
			({ content, name }): Note => ({
				content,
				createdAt: now,
				fileContent: content,
				fileName: name,
				id: crypto.randomUUID(),
				updatedAt: now
			})
		);

		this.notes.unshift(...notes);

		for (const [index, note] of notes.entries()) {
			await NotesDatabaseService.put(note);

			const handle = files[index].handle;

			if (handle) await NotesDatabaseService.putFileHandle(note.id, handle);
		}

		return notes;
	}

	dismissFileError(): void {
		this.fileError = null;
	}

	/** Writes a note's pending edit now instead of after the debounce. */
	async flush(id: string): Promise<void> {
		const timer = this.saveTimers.get(id);

		if (timer === undefined) return;

		clearTimeout(timer);
		this.saveTimers.delete(id);

		const note = this.get(id);

		if (note) await NotesDatabaseService.put($state.snapshot(note));
	}

	get(id: string): Note | undefined {
		return this.notes.find((note) => note.id === id);
	}

	async load(): Promise<void> {
		if (this.loaded) return;

		this.notes = await NotesDatabaseService.all();
		this.loaded = true;
	}

	/** Asks for Markdown files and opens each as a note; reports a failure in `fileError`. */
	async open(source: DataTransfer | 'picker' = 'picker'): Promise<Note[]> {
		try {
			const files =
				source === 'picker' ? await NoteFileService.open() : await NoteFileService.fromDrop(source);

			return await this.createFromFiles(files);
		} catch (error) {
			this.fileError = { action: 'open', message: errorMessage(error) };

			return [];
		}
	}

	async remove(id: string): Promise<void> {
		clearTimeout(this.saveTimers.get(id));
		this.saveTimers.delete(id);
		this.notes = this.notes.filter((note) => note.id !== id);
		await NotesDatabaseService.remove(id);
	}

	/**
	 * Saves a note to its Markdown file, or to a new one when it has none or `saveAs` asks;
	 * reports a failure in `fileError`. Whether it was saved: not when the person cancelled.
	 */
	async saveToFile(id: string, { saveAs = false }: { saveAs?: boolean } = {}): Promise<boolean> {
		const note = this.get(id);

		if (!note) return false;

		const content = note.content;

		try {
			const saved = await NoteFileService.save(content, {
				handle: await NotesDatabaseService.fileHandle(id),
				name: markdownFileName(note),
				saveAs
			});

			if (!saved) return false;

			if (saved.handle) await NotesDatabaseService.putFileHandle(id, saved.handle);

			// what was written; edits made meanwhile stay unsaved
			note.fileName = saved.name;
			note.fileContent = content;
			await this.flush(id);
			await NotesDatabaseService.put($state.snapshot(note));

			return true;
		} catch (error) {
			this.fileError = { action: 'save', message: errorMessage(error) };

			return false;
		}
	}

	setContent(id: string, content: string): void {
		const note = this.get(id);

		if (!note || note.content === content) return;

		note.content = content;
		note.updatedAt = Date.now();

		// the edited note comes first; the others keep their order
		const index = this.notes.indexOf(note);

		if (index > 0) {
			this.notes.splice(index, 1);
			this.notes.unshift(note);
		}

		clearTimeout(this.saveTimers.get(id));
		this.saveTimers.set(
			id,
			setTimeout(() => void this.flush(id), SAVE_DEBOUNCE_MS)
		);
	}
}

export const notesStore = new NotesStore();
