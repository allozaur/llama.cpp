/**
 * promptsStore - Reusable system messages kept in the prompt library
 *
 * Mirrors the prompts table through DatabaseService, like projectsStore: every
 * mutation awaits the row write, then applies the change to the loaded list.
 */

import { browser } from '$app/environment';
import { DatabaseService } from '$lib/services/database.service';
import type { DatabasePrompt } from '$lib/types/database';
import { uuid } from '$lib/utils';

/** Fields a prompt is built from; the name is required, the description optional. */
export interface PromptDraft {
	name: string;
	content: string;
	description?: string;
}

/** Trims the text fields, dropping an empty description. */
function normalize(draft: PromptDraft): PromptDraft {
	const description = draft.description?.trim();

	return {
		content: draft.content.trim(),
		description: description || undefined,
		name: draft.name.trim()
	};
}

class PromptsStore {
	/** Whether the library was read from the database at least once. */
	isInitialized = $state(false);

	/** All prompts, most recently edited first. */
	prompts = $state<DatabasePrompt[]>([]);

	private initPromise: Promise<void> | null = null;

	/**
	 * Adds a prompt to the library and puts it at the top of the list.
	 *
	 * @param draft - Name, content and optional description
	 * @returns The created prompt, or undefined when the name or content is empty
	 */
	async add(draft: PromptDraft): Promise<DatabasePrompt | undefined> {
		const next = normalize(draft);

		if (!next.name || !next.content) return undefined;

		const prompt: DatabasePrompt = { ...next, id: uuid(), lastModified: Date.now() };

		try {
			await DatabaseService.createPrompt(prompt);
		} catch (error) {
			console.error('Failed to create prompt:', error);

			return undefined;
		}

		this.prompts = [prompt, ...this.prompts];

		return prompt;
	}

	get(id: string): DatabasePrompt | undefined {
		return this.prompts.find((prompt) => prompt.id === id);
	}

	/**
	 * Reads every prompt from the database.
	 * Safe to call multiple times: concurrent callers share a single run,
	 * and a failed run can be retried by calling again.
	 */
	initialize(): Promise<void> {
		if (!browser) return Promise.resolve();

		if (this.initPromise) return this.initPromise;

		this.initPromise = (async () => {
			try {
				this.prompts = await DatabaseService.getAllPrompts();
				this.isInitialized = true;
			} catch (error) {
				console.error('Failed to load prompts:', error);
				this.initPromise = null;
			}
		})();

		return this.initPromise;
	}

	/**
	 * Deletes a prompt. System messages linked to it keep their content.
	 *
	 * @param id - Prompt ID
	 */
	async remove(id: string): Promise<void> {
		try {
			await DatabaseService.deletePrompt(id);
		} catch (error) {
			console.error('Failed to delete prompt:', error);

			return;
		}

		this.prompts = this.prompts.filter((prompt) => prompt.id !== id);
	}

	/**
	 * Matches prompts by name, description or content, ignoring case.
	 * An empty query returns every prompt.
	 *
	 * @param query - Text to look for
	 */
	search(query: string): DatabasePrompt[] {
		const q = query.trim().toLowerCase();

		if (!q) return this.prompts;

		return this.prompts.filter(
			(prompt) =>
				prompt.name.toLowerCase().includes(q) ||
				(prompt.description?.toLowerCase().includes(q) ?? false) ||
				prompt.content.toLowerCase().includes(q)
		);
	}

	/**
	 * Edits a prompt and bumps its `lastModified`. An empty name keeps the current one.
	 *
	 * @param id - Prompt ID
	 * @param changes - The fields to change
	 */
	async update(id: string, changes: Partial<PromptDraft>): Promise<void> {
		const prompt = this.get(id);

		if (!prompt) return;

		const next = normalize({ ...prompt, ...changes });

		if (!next.content) return;

		const updated: DatabasePrompt = {
			...prompt,
			content: next.content,
			description: next.description,
			lastModified: Date.now(),
			name: next.name || prompt.name
		};

		try {
			await DatabaseService.updatePrompt(id, updated);
		} catch (error) {
			console.error('Failed to update prompt:', error);

			return;
		}

		this.prompts = this.prompts.map((p) => (p.id === id ? updated : p));
	}
}

export const promptsStore = new PromptsStore();
