import { extensions, type SystemPromptEntry, type SystemPromptSource } from '$lib/extensions';
import { promptsStore } from '$lib/stores';

/** The prompts one source offers, under the source's heading in the list. */
export interface SystemPromptGroup {
	entries: SystemPromptEntry[];
	source: SystemPromptSource;
}

export interface UseSystemMessagePromptsOptions {
	/** A source's prompt with arguments was chosen; the caller has the source ask for them. */
	onPromptArguments: (source: SystemPromptSource, entry: SystemPromptEntry) => void;
	/** A library prompt, or a source's prompt without arguments, was chosen; the text becomes the system message. */
	onPromptSelect: (content: string, promptId: string, title: string) => void;
}

/**
 * Data and actions behind the System message list, shared by the dropdown
 * submenu and the mobile drawer. Beside the prompt library it lists what
 * extensions offer as system messages, such as MCP prompts; those load on
 * demand, when the list opens.
 */
export function useSystemMessagePrompts(opts: UseSystemMessagePromptsOptions) {
	let searchQuery = $state('');
	let loaded = $state.raw<SystemPromptGroup[]>([]);

	const libraryPrompts = $derived(promptsStore.search(searchQuery));
	const sourceGroups = $derived.by<SystemPromptGroup[]>(() => {
		// a source switched off since the list loaded no longer shows
		const sources = extensions.contributions('systemPromptSources');
		const q = searchQuery.trim().toLowerCase();

		return loaded
			.filter((group) => sources.includes(group.source))
			.map((group) => ({
				entries: q
					? group.entries.filter(
							(entry) =>
								entry.title.toLowerCase().includes(q) ||
								(entry.description || '').toLowerCase().includes(q) ||
								entry.origin.toLowerCase().includes(q)
						)
					: group.entries,
				source: group.source
			}))
			.filter((group) => group.entries.length > 0);
	});
	/** Whether the list has anything to show, so the search field is worth offering. */
	const hasPrompts = $derived(
		promptsStore.prompts.length > 0 || loaded.some((group) => group.entries.length > 0)
	);
	/** Whether a search left nothing to show. */
	const hasNoMatches = $derived(
		searchQuery.trim() !== '' && libraryPrompts.length === 0 && sourceGroups.length === 0
	);

	async function loadSourcePrompts(): Promise<void> {
		loaded = await Promise.all(
			extensions.contributions('systemPromptSources').map(async (source) => {
				try {
					return { entries: await source.list(), source };
				} catch (error) {
					console.error(`[useSystemMessagePrompts] Failed to load ${source.label}:`, error);

					return { entries: [], source };
				}
			})
		);
	}

	function selectLibraryPrompt(id: string): void {
		const prompt = promptsStore.get(id);

		if (prompt) opts.onPromptSelect(prompt.content, prompt.id, prompt.name);
	}

	async function selectSourcePrompt(
		source: SystemPromptSource,
		entry: SystemPromptEntry
	): Promise<void> {
		if (entry.argumentCount > 0) {
			opts.onPromptArguments(source, entry);

			return;
		}

		try {
			const text = await source.resolve(entry);

			if (!text) return;

			opts.onPromptSelect(text, entry.id, entry.title);
		} catch (error) {
			console.error('[useSystemMessagePrompts] Failed to run the prompt:', error);
		}
	}

	return {
		get hasNoMatches() {
			return hasNoMatches;
		},
		get hasPrompts() {
			return hasPrompts;
		},
		get libraryPrompts() {
			return libraryPrompts;
		},
		loadSourcePrompts,
		get searchQuery() {
			return searchQuery;
		},
		set searchQuery(value: string) {
			searchQuery = value;
		},
		selectLibraryPrompt,
		selectSourcePrompt,
		get sourceGroups() {
			return sourceGroups;
		}
	};
}
