import { TOKENIZE_DEBOUNCE_MS } from '#lib/constants/index.ts';
import { streamCompletion } from '#lib/services/completion.service.ts';
import { countTokens } from '#lib/services/tokenize.service.ts';
import type { GenerationStats } from '#lib/types/notes.ts';
import { contextUsed, statsFromTimings } from '#lib/utils/generation-stats.ts';

/** How a session reads and writes the text of the note it works on. */
export interface NoteDocument {
	read: () => string;
	write: (content: string) => void;
}

/**
 * One open note's work with the model: generating a continuation, stopping it, undoing and
 * redoing the last generation, and counting the note's tokens.
 */
export class NoteSession {
	isGenerating = $state(false);
	/** The generated text an undo took away, until the note is edited. */
	undoneContent = $state<string | null>(null);
	canRedo = $derived(this.undoneContent !== null && !this.isGenerating);
	/** The text before the last generation, until the note is edited. */
	previousContent = $state<string | null>(null);
	canUndo = $derived(this.previousContent !== null && !this.isGenerating);
	error = $state<string | null>(null);

	/** Timings of the last generation run. */
	stats = $state<GenerationStats | null>(null);
	/** Tokens of the note, or null while unknown. */
	totalTokens = $state<number | null>(null);

	private abortController: AbortController | null = null;
	private tokenizeAbort: AbortController | null = null;
	private tokenizeTimer: ReturnType<typeof setTimeout> | undefined;

	constructor(private readonly document: NoteDocument) {}

	dismissError(): void {
		this.error = null;
	}

	dispose(): void {
		this.stop();
		this.cancelTokenCount();
	}

	/** The user changed the text: the last generation can no longer be undone or redone. */
	edited(model?: string): void {
		this.previousContent = null;
		this.undoneContent = null;
		this.scheduleTokenCount(model);
	}

	async generate(model?: string): Promise<void> {
		if (this.isGenerating) return;

		const prompt = this.document.read();
		const controller = new AbortController();

		this.cancelTokenCount();
		this.abortController = controller;
		this.previousContent = prompt;
		this.undoneContent = null;
		this.error = null;
		this.stats = null;
		this.isGenerating = true;

		try {
			await streamCompletion(prompt, {
				model,
				onChunk: (text) => this.document.write(this.document.read() + text),
				onTimings: (timings, promptProgress) => {
					this.stats = statsFromTimings(timings, promptProgress, this.stats ?? undefined);

					if (timings) this.totalTokens = contextUsed(this.stats);
				},
				signal: controller.signal
			});
		} catch (error) {
			this.error = error instanceof Error ? error.message : String(error);
		} finally {
			// a newer run owns the state once it has started
			if (this.abortController === controller) {
				this.abortController = null;
				this.isGenerating = false;

				// nothing was added: there is no generation to undo
				if (this.document.read() === prompt) this.previousContent = null;
			}
		}
	}

	redo(model?: string): void {
		if (!this.canRedo || this.undoneContent === null) return;

		this.previousContent = this.document.read();
		this.document.write(this.undoneContent);
		this.undoneContent = null;
		this.scheduleTokenCount(model);
	}

	/** Counts the note's tokens once the text has settled. */
	scheduleTokenCount(model?: string): void {
		this.cancelTokenCount();

		this.tokenizeTimer = setTimeout(async () => {
			const content = this.document.read();

			if (content.length === 0) {
				this.totalTokens = 0;

				return;
			}

			const controller = new AbortController();

			this.tokenizeAbort = controller;

			const count = await countTokens(content, model, controller.signal);

			if (!controller.signal.aborted && !this.isGenerating) this.totalTokens = count;
		}, TOKENIZE_DEBOUNCE_MS);
	}

	stop(): void {
		this.abortController?.abort();
		this.isGenerating = false;
	}

	undo(model?: string): void {
		if (!this.canUndo || this.previousContent === null) return;

		this.undoneContent = this.document.read();
		this.document.write(this.previousContent);
		this.previousContent = null;
		this.scheduleTokenCount(model);
	}

	private cancelTokenCount(): void {
		clearTimeout(this.tokenizeTimer);
		this.tokenizeAbort?.abort();
		this.tokenizeAbort = null;
	}
}
