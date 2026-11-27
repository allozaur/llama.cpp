import type { PromptEntry, PromptSource } from '#lib/extensions/index.ts';
import { promptsStore } from '#lib/stores/index.ts';

/** The prompts one source offers, under the source's heading in a list. */
export interface PromptGroup {
	entries: PromptEntry[];
	source: PromptSource;
}

/** A prompt with the source that offers it. */
export interface PromptItem {
	entry: PromptEntry;
	source: PromptSource;
}

function matches(entry: PromptEntry, query: string): boolean {
	return (
		entry.title.toLowerCase().includes(query) ||
		(entry.description?.toLowerCase().includes(query) ?? false) ||
		entry.origin.toLowerCase().includes(query)
	);
}

/**
 * The prompts of every source, for a list that shows them together: the chat form's
 * prompt picker and its System message list. The sources are asked when the list
 * opens, not before.
 */
export function usePromptList() {
	let searchQuery = $state('');
	let loaded = $state.raw<PromptGroup[]>([]);
	let isLoading = $state(false);

	const groups = $derived.by<PromptGroup[]>(() => {
		// a source switched off since the list loaded no longer shows
		const sources = promptsStore.sources;
		const query = searchQuery.trim().toLowerCase();

		return loaded
			.filter((group) => sources.includes(group.source))
			.map((group) => ({
				entries: query ? group.entries.filter((entry) => matches(entry, query)) : group.entries,
				source: group.source
			}))
			.filter((group) => group.entries.length > 0);
	});
	const items = $derived<PromptItem[]>(
		groups.flatMap((group) => group.entries.map((entry) => ({ entry, source: group.source })))
	);
	/** How many prompts there are before any search. */
	const total = $derived(loaded.reduce((count, group) => count + group.entries.length, 0));

	/** Asks every source for its prompts. A source that fails leaves the others' prompts. */
	async function load(): Promise<void> {
		isLoading = true;

		const sources = promptsStore.sources;
		const listings = await Promise.allSettled(sources.map((source) => source.list()));

		loaded = listings.map((listing, index) => {
			if (listing.status === 'rejected') {
				console.error(`Failed to list the prompts of ${sources[index].label}:`, listing.reason);
			}

			return {
				entries: listing.status === 'fulfilled' ? listing.value : [],
				source: sources[index]
			};
		});
		isLoading = false;
	}

	return {
		get groups() {
			return groups;
		},
		get isLoading() {
			return isLoading;
		},
		get items() {
			return items;
		},
		load,
		get searchQuery() {
			return searchQuery;
		},
		set searchQuery(value: string) {
			searchQuery = value;
		},
		get total() {
			return total;
		}
	};
}
