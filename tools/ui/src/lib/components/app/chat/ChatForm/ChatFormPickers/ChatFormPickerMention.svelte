<script lang="ts">
	import { File, Folder, Server } from '@lucide/svelte';
	import { ChatFormPickerList, ChatFormPickerListItem } from '$lib/components/app/chat';
	import HighlightedMatch from '$lib/components/app/forms/HighlightedMatch.svelte';
	import * as Popover from '$lib/components/ui/popover';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import { FILE_GLOB_SEARCH_PICKERS, HOME_TILDE, SEARCH } from '$lib/constants';
	import {
		BuiltInTool,
		FileMentionEntryType,
		GlobSearchType,
		KeyboardKey,
		MentionPickerSource,
		ToolSource
	} from '$lib/enums';
	import { useDebouncedSearch } from '$lib/hooks/use-debounced-search.svelte';
	import { usePickerNavigation } from '$lib/hooks/use-picker-navigation.svelte';
	import {
		conversationsStore,
		deviceStore,
		mcpStore,
		settingsStore,
		toolsStore
	} from '$lib/stores';
	import type { FileMentionEntry, GlobEntryResult } from '$lib/types';
	import { abbreviateHome, runGlobSearchWithChildren } from '$lib/utils';

	/**
	 * Floating mention picker over the server filesystem and the MCP resources
	 * of the connected servers. In the chat form the input is the search
	 * surface: `query` (typed after `@`) drives a `file_glob_search` tool call
	 * scoped to `scopePath`, and MCP resources are filtered client-side. The
	 * parent owns the "dismissed token, don't re-open until it changes"
	 * snapshot; a host without an `@` token shows the list's search field and
	 * binds `query` instead.
	 */
	interface Props {
		class?: string;
		isOpen: boolean;
		/** Restricts the listed kinds; both are listed by default. */
		source?: MentionPickerSource;
		/** Renders the list's own search field, for hosts without an `@` token. */
		showSearchInput?: boolean;
		query: string;
		customAnchor?: HTMLElement | null;
		scopePath?: string | null;
		onClose: () => void;
		onSelect: (entry: FileMentionEntry) => void;
		/** Fired when `isOpen` becomes true, so the host can keep focus on the chat input. */
		onOpened?: () => void;
	}

	let {
		class: className = '',
		customAnchor = null,
		isOpen,
		onClose,
		onOpened,
		onSelect,
		query = $bindable(''),
		scopePath = null,
		showSearchInput = false,
		source = MentionPickerSource.ALL
	}: Props = $props();

	const nav = usePickerNavigation({
		count: () => displayedItems.length,
		isOpen: () => isOpen,
		onClose: () => onClose(),
		onSelect: (index) => handleSelect(displayedItems[index])
	});

	// When the server does not expose file_glob_search (started without
	// --tools) or the user disabled it, the picker still opens but explains
	// why instead of firing searches that would only fail.
	const fileSearchKey = $derived(toolsStore.getPermissionKey(BuiltInTool.SERVER_FILE_GLOB_SEARCH));
	// effective policy: the active conversation's tool policy, or global defaults
	const fileSearchEnabled = $derived(
		fileSearchKey !== null &&
			conversationsStore.preferences.isToolEnabled(fileSearchKey) &&
			conversationsStore.preferences.isCategoryEnabled(ToolSource.SERVER)
	);

	let searchResults = $state<FileMentionEntry[]>([]);
	let searchError = $state<string | null>(null);

	// Coerce the depth setting to a positive integer; an invalid value
	// would otherwise reach the server as max_depth 0 = unlimited.
	const searchDepth = $derived.by(() => {
		const n = Number(settingsStore.config.mentionSearchMaxDepth);

		return Number.isInteger(n) && n > 0 ? n : FILE_GLOB_SEARCH_PICKERS.DEFAULT_SEARCH_DEPTH;
	});

	const home = $derived(toolsStore.serverHome);

	// A smaller window than the WD picker suffices: entries are ranked client-side.
	const MENTION_SEARCH_LIMIT = 50;

	const searchesFiles = $derived(source !== MentionPickerSource.MCP_RESOURCES);

	const search = useDebouncedSearch({
		canRun: () => isOpen && searchesFiles && fileSearchEnabled,
		debounceMs: SEARCH.DEBOUNCE_MS,
		getQuery: () => trimmedQuery,
		run: async (query, signal, isCurrent) => {
			try {
				// A trailing path separator targets a directory, so also list its
				// children. Accept both `/` and `\`.
				const res = await runGlobSearchWithChildren(
					query,
					scopePath ?? home ?? HOME_TILDE,
					searchDepth,
					MENTION_SEARCH_LIMIT,
					signal,
					{ descendOnTrailingSeparator: true, type: GlobSearchType.ALL }
				);

				if (!isCurrent()) return;

				if (res.error) {
					searchResults = [];
					searchError = res.error;

					return;
				}

				const toEntry = (e: GlobEntryResult): FileMentionEntry => ({
					name: e.name,
					path: e.path,
					type: e.type === 'dir' ? FileMentionEntryType.DIRECTORY : FileMentionEntryType.FILE
				});

				searchResults = res.entries.map(toEntry);
				searchError = null;
			} catch (err) {
				if (!isCurrent() || signal.aborted) return;

				searchResults = [];
				searchError = err instanceof Error ? err.message : String(err);
			}
		}
	});

	const trimmedQuery = $derived((query ?? '').trim());

	// Resources of the enabled servers, filtered by the query client-side: the
	// picker also opens with an empty query from hosts without an `@` token.
	const listsMcpResources = $derived(source !== MentionPickerSource.FILES);
	const mcpResourcesEnabled = $derived(
		conversationsStore.preferences.isCategoryEnabled(ToolSource.MCP) &&
			mcpStore.getServersWithResources().length > 0
	);
	const mcpResourceEntries = $derived.by(() => {
		if (!listsMcpResources || !mcpResourcesEnabled) return [];

		const needle = trimmedQuery.toLowerCase();
		const entries: FileMentionEntry[] = [];

		for (const [serverName, serverResources] of mcpStore.resources.serverResources) {
			for (const resource of serverResources.resources) {
				const name = resource.title || resource.name;

				if (
					needle &&
					!name.toLowerCase().includes(needle) &&
					!resource.uri.toLowerCase().includes(needle)
				) {
					continue;
				}

				entries.push({
					name,
					path: resource.uri,
					serverName,
					type: FileMentionEntryType.MCP_RESOURCE
				});

				if (entries.length >= MENTION_SEARCH_LIMIT) return entries;
			}
		}

		return entries;
	});

	const displayedItems = $derived([...searchResults, ...mcpResourceEntries]);

	const emptyMessage = $derived.by(() => {
		if (!searchesFiles && mcpResourceEntries.length === 0) {
			return mcpResourcesEnabled
				? 'No matching MCP resources'
				: 'No MCP server with resources is connected';
		}

		if (!searchesFiles) return 'No matching files or folders';

		if (fileSearchKey === null) {
			return 'File search is unavailable on this server (started without --tools)';
		}

		if (!fileSearchEnabled) {
			return 'File search is disabled - enable "Search files" in Settings > Tools to use @-mentions';
		}

		return searchError ? `Search failed - ${searchError}` : 'No matching files or folders';
	});

	const showTooltip = $derived(!deviceStore.isMobile);

	$effect(() => {
		if (typeof window === 'undefined') return;

		void toolsStore.resolveServerHome();
	});

	$effect(() => {
		if (isOpen) {
			nav.reset(0);
		}
	});

	$effect(() => {
		if (!isOpen) return;

		onOpened?.();

		if (mcpResourcesEnabled) void mcpStore.fetchAllResources();
	});

	$effect(() => {
		const q = (query ?? '').trim();

		if (!isOpen || !q || !fileSearchEnabled) {
			search.cancel();
			searchResults = [];
			searchError = null;

			return;
		}

		search.setLoading(true);
		search.run(q);
	});

	function handleSelect(entry: FileMentionEntry) {
		onSelect(entry);
		onClose();
	}

	export function handleKeydown(event: KeyboardEvent): boolean {
		// Always consume Enter while the picker is open - even with no
		// result yet (skeletons) or no matches - so the chat form's
		// Enter-to-submit never fires mid-search.
		if (isOpen && event.key === KeyboardKey.ENTER) {
			event.preventDefault();

			if (nav.hoveredIndex >= 0 && displayedItems[nav.hoveredIndex]) {
				handleSelect(displayedItems[nav.hoveredIndex]);
			}

			return true;
		}

		return nav.handleKeydown(event);
	}
</script>

<Popover.Root
	onOpenChange={(open) => {
		if (!open) onClose();
	}}
	open={isOpen}
>
	<!-- Invisible form-wide trigger: stops bits-ui's outside-click detector
	     from closing the picker when the user clicks inside the textarea.
	     We open programmatically via `open={isOpen}`, so it is inert
	     (tabindex=-1 + pointer-events-none + opacity-0 + aria-hidden).
	     Positioning comes from `customAnchor` at the form's top edge. -->
	<Popover.Trigger
		aria-hidden="true"
		class="pointer-events-none absolute inset-0 opacity-0"
		tabindex={-1}
	>
		<span class="sr-only">Open file mention picker</span>
	</Popover.Trigger>

	<Popover.Content
		align="start"
		class={[
			'w-[var(--bits-popover-anchor-width)] max-w-none rounded-xl border-border/50 p-0 shadow-xl',
			className
		]}
		{customAnchor}
		onCloseAutoFocus={(event) => event.preventDefault()}
		onOpenAutoFocus={(event) => event.preventDefault()}
		onkeydown={handleKeydown}
		preventScroll={false}
		side="top"
		sideOffset={12}
	>
		<ChatFormPickerList
			bind:searchQuery={query}
			{emptyMessage}
			isLoading={search.isSearching}
			itemKey={(entry) => entry.type + ':' + entry.path}
			items={displayedItems}
			onSearchClose={onClose}
			scrollTrigger={nav.scrollTrigger}
			searchPlaceholder="Search files and resources"
			selectedIndex={nav.hoveredIndex}
			{showSearchInput}
		>
			{#snippet item(entry, index, isSelected)}
				<ChatFormPickerListItem
					dataIndex={index}
					{isSelected}
					onclick={() => handleSelect(entry)}
					onmouseenter={() => nav.setHover(index)}
				>
					{@const Icon =
						entry.type === FileMentionEntryType.DIRECTORY
							? Folder
							: entry.type === FileMentionEntryType.MCP_RESOURCE
								? Server
								: File}
					<Icon
						class={[
							'mt-0.5 size-icon-md shrink-0',
							entry.type === FileMentionEntryType.DIRECTORY
								? 'text-amber-500'
								: 'text-muted-foreground'
						]}
					/>

					<div class="flex min-w-0 flex-1 flex-col">
						<div class="flex min-w-0 items-center gap-2">
							{#if showTooltip}
								<Tooltip.Root>
									<Tooltip.Trigger>
										{#snippet child({ props })}
											<span {...props} class="truncate text-sm font-medium">{entry.name}</span>
										{/snippet}
									</Tooltip.Trigger>

									<Tooltip.Content>
										<p>{entry.path}</p>
									</Tooltip.Content>
								</Tooltip.Root>
							{:else}
								<span class="truncate text-sm font-medium">{entry.name}</span>
							{/if}

							<span
								class="shrink-0 rounded-full bg-muted px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wide text-muted-foreground"
							>
								{entry.type}
							</span>
						</div>

						<span class="min-w-0 flex-1 truncate font-mono text-left text-xs">
							{#if entry.type === FileMentionEntryType.MCP_RESOURCE}
								{entry.serverName}
							{:else}
								<HighlightedMatch query={trimmedQuery} text={abbreviateHome(entry.path, home)} />
							{/if}
						</span>
					</div>
				</ChatFormPickerListItem>
			{/snippet}
		</ChatFormPickerList>
	</Popover.Content>
</Popover.Root>
