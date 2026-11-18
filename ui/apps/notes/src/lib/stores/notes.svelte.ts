import { SAVE_DEBOUNCE_MS } from '#lib/constants/index.ts';
import { NotesDatabaseService } from '#lib/services/notes-database.service.ts';
import type { Note } from '#lib/types/notes.ts';

/** The notes kept in this browser, the most recently edited first. */
export class NotesStore {
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

	async remove(id: string): Promise<void> {
		clearTimeout(this.saveTimers.get(id));
		this.saveTimers.delete(id);
		this.notes = this.notes.filter((note) => note.id !== id);
		await NotesDatabaseService.remove(id);
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
