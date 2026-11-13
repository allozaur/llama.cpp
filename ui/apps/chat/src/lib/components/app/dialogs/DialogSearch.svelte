<script lang="ts">
	import * as Dialog from '@ggml/llama-ui/ui/dialog';
	import { ArrowDown, ArrowUp, CornerDownLeft, MessageSquare, Pin, X } from '@lucide/svelte';
	import { goto } from '$app/navigation';
	import { ActionIcon, KeyboardShortcutInfo } from '$lib/components/app';
	import {
		DISCOVER_ICON,
		ICON_CLASS_DEFAULT,
		ICON_CLASS_SM,
		ICON_CLASS_XS,
		MODELS_DISCOVER_SEARCH_DEBOUNCE_MS,
		PROJECT_ICON,
		SIDEBAR_ACTIONS_ITEMS
	} from '$lib/constants';
	import { KeyboardKey, SidebarAction } from '$lib/enums';
	import { extensions, type NavigationItem } from '$lib/extensions';
	import { HuggingFaceService } from '$lib/services';
	import { RouterService } from '$lib/services/router.service';
	import {
		conversationsStore,
		deviceStore,
		modelsDiscoverStore,
		projectsStore,
		uiStore
	} from '$lib/stores';
	import type { HfModelInfo } from '$lib/types/huggingface';
	import { formatRelativeTime, isIMEComposing, sidebarFooterItems } from '$lib/utils';
	import type { Component } from 'svelte';

	interface Props {
		open: boolean;
		/** Runs a sidebar action picked from the actions section. */
		onAction?: (action: SidebarAction) => void;
		/** Opens an extension's item picked from the actions section. */
		onContributed?: (item: NavigationItem) => void;
	}

	let { onAction, onContributed, open = $bindable() }: Props = $props();

	interface SearchEntry {
		icon: Component;
		id: string;
		keys?: string[];
		label: string;
		meta?: string;
		pinned?: boolean;
		run: () => void;
	}

	interface SearchSection {
		entries: SearchEntry[];
		/** Shown in place of the entries a section is still waiting for, or failed to get. */
		note?: string;
		title: string;
	}

	/** Recent chats shown before typing, so the actions stay in view below them. */
	const RECENT_LIMIT = 5;
	/** Matches kept while typing; the rest stays reachable by typing more. */
	const MATCH_LIMIT = 50;
	/** Hub models listed; the models page shows the whole search. */
	const HUB_LIMIT = 6;

	let query = $state('');
	let highlighted = $state(0);
	let inputRef = $state<HTMLInputElement | null>(null);

	const needle = $derived(query.trim().toLowerCase());
	const limit = $derived(needle ? MATCH_LIMIT : RECENT_LIMIT);

	function matches(label: string): boolean {
		return !needle || label.toLowerCase().includes(needle);
	}

	const chatEntries = $derived.by((): SearchEntry[] =>
		conversationsStore.conversations
			.filter((conversation) => matches(conversation.name))
			.sort((a, b) => b.lastModified - a.lastModified)
			.slice(0, limit)
			.map((conversation) => {
				const project = conversation.projectId
					? projectsStore.get(conversation.projectId)
					: undefined;
				const time = formatRelativeTime(conversation.lastModified);

				return {
					icon: MessageSquare,
					id: `chat-${conversation.id}`,
					label: conversation.name,
					meta: project ? `${project.name} · ${time}` : time,
					pinned: conversation.pinned,
					run: () => close(() => goto(RouterService.conversation(conversation)))
				};
			})
	);

	const projectEntries = $derived.by((): SearchEntry[] =>
		projectsStore.projects
			.filter((project) => matches(project.name))
			.slice(0, limit)
			.map((project) => ({
				icon: PROJECT_ICON,
				id: `project-${project.id}`,
				label: project.name,
				meta: project.archived ? 'Archived' : undefined,
				run: () => close(() => uiStore.openProjectDialog({ projectId: project.id }))
			}))
	);

	const actionEntries = $derived.by((): SearchEntry[] =>
		// every sidebar action but Search itself, which is what opened this dialog, and the models
		// manager on a phone, which picks its models in the selector; extensions' items among them
		[...SIDEBAR_ACTIONS_ITEMS, ...sidebarFooterItems(extensions.contributions('navigation'))]
			.filter(
				(item) =>
					(item.action || item.contributed) &&
					item.action !== SidebarAction.SEARCH &&
					(item.action !== SidebarAction.MANAGE_MODELS || !deviceStore.isMobile)
			)
			.map(({ action, contributed, icon, keys, tooltip }) => ({
				icon,
				id: `action-${action ?? contributed?.id}`,
				keys,
				label: tooltip,
				run: () =>
					close(() => {
						if (action) onAction?.(action);
						else if (contributed) onContributed?.(contributed);
					})
			}))
			.filter((entry) => matches(entry.label))
	);

	// Hub models answer the typed term wherever the models page searches the Hub
	const searchesHub = $derived(open && uiStore.isDiscoverEnabled && needle.length > 0);

	let hubModels = $state<HfModelInfo[]>([]);
	let hubNote = $state<string | undefined>();

	$effect(() => {
		hubModels = [];
		hubNote = undefined;

		if (!searchesHub) return;

		const term = needle;

		let cancelled = false;

		hubNote = 'Searching Hugging Face...';

		// the same debounce the models page waits for after the last keystroke
		const timer = setTimeout(async () => {
			try {
				// the models page's own search, so the first matches here lead its list too
				const models = await modelsDiscoverStore.searchHub(term);

				if (cancelled) return;

				hubModels = models.slice(0, HUB_LIMIT);
				hubNote = undefined;
			} catch {
				if (!cancelled) hubNote = 'Could not search Hugging Face';
			}
		}, MODELS_DISCOVER_SEARCH_DEBOUNCE_MS);

		return () => {
			cancelled = true;
			clearTimeout(timer);
		};
	});

	const hubEntries = $derived.by((): SearchEntry[] =>
		hubModels.map((model) => ({
			icon: DISCOVER_ICON,
			id: `hub-${model.id}`,
			label: model.id,
			meta: `${HuggingFaceService.formatDownloads(model.downloads)} downloads`,
			run: () => close(() => openHubModel(model.id))
		}))
	);

	// last, so matches arriving from the Hub never move the rows above them
	const sections = $derived<SearchSection[]>(
		[
			{ entries: chatEntries, title: needle ? 'Chats' : 'Recents' },
			{ entries: projectEntries, title: 'Projects' },
			{ entries: actionEntries, title: 'Actions' },
			{ entries: hubEntries, note: hubNote, title: 'Models on Hugging Face' }
		].filter((section) => section.entries.length > 0 || section.note)
	);

	const entries = $derived(sections.flatMap((section) => section.entries));
	const activeIndex = $derived(Math.min(highlighted, entries.length - 1));

	const emptyMessage = $derived(needle ? 'No results found' : 'No chats yet');

	/**
	 * Shows a Hub model's details over the models page; a phone, which has no models
	 * page in its navigation, opens them over the page it is on.
	 */
	function openHubModel(repo: string) {
		if (!deviceStore.isMobile) uiStore.openModelsManager();

		uiStore.openHubModelDetails(repo);
	}

	/** Closes the search first, so a dialog opened by `next` takes the focus. */
	function close(next: () => void) {
		handleOpenChange(false);
		next();
	}

	function move(step: number) {
		if (entries.length === 0) return;

		highlighted = (activeIndex + step + entries.length) % entries.length;
		document.getElementById(`search-result-${highlighted}`)?.scrollIntoView({ block: 'nearest' });
	}

	function handleKeydown(event: KeyboardEvent) {
		// while an IME is composing, Enter confirms a candidate and the arrows move through them
		if (isIMEComposing(event)) return;

		if (event.key === KeyboardKey.ARROW_DOWN) {
			event.preventDefault();
			move(1);
		} else if (event.key === KeyboardKey.ARROW_UP) {
			event.preventDefault();
			move(-1);
		} else if (event.key === KeyboardKey.ENTER) {
			event.preventDefault();
			entries[activeIndex]?.run();
		}
	}

	function handleOpenChange(nextOpen: boolean) {
		if (!nextOpen) {
			query = '';
			highlighted = 0;
		}

		open = nextOpen;
	}
</script>

{#snippet hint(label: string, keys: (string | Component)[])}
	<span class="flex items-center gap-1.5">
		{label}

		<span class="flex items-center gap-1">
			{#each keys as Key, index (index)}
				<kbd
					class="inline-flex h-5 min-w-5 items-center justify-center rounded border border-border/60 px-1 font-sans text-[11px]"
				>
					{#if typeof Key === 'string'}
						{Key}
					{:else}
						<Key class={ICON_CLASS_XS} />
					{/if}
				</kbd>
			{/each}
		</span>
	</span>
{/snippet}

{#snippet search()}
	<div class="border-b border-border/30 px-4 py-3 dark:border-border/20">
		<div class="flex items-center gap-2">
			<input
				bind:this={inputRef}
				bind:value={query}
				aria-activedescendant={entries.length > 0 ? `search-result-${activeIndex}` : undefined}
				aria-controls="search-results"
				aria-expanded="true"
				autocomplete="off"
				class="h-10 min-w-0 flex-1 border-0 bg-transparent px-1 text-lg outline-none placeholder:text-muted-foreground focus:outline-none focus-visible:ring-0"
				oninput={() => (highlighted = 0)}
				onkeydown={handleKeydown}
				placeholder="Search"
				role="combobox"
				spellcheck={false}
			/>

			<ActionIcon
				ariaLabel="Close search"
				class="size-8 shrink-0 text-muted-foreground"
				icon={X}
				iconSize={ICON_CLASS_DEFAULT}
				onclick={() => handleOpenChange(false)}
			/>
		</div>
	</div>

	<div class="min-h-0 flex-1 overflow-y-auto p-2" id="search-results" role="listbox">
		{#each sections as section, sectionIndex (section.title)}
			{@const offset = sections
				.slice(0, sectionIndex)
				.reduce((total, previous) => total + previous.entries.length, 0)}

			<div class="flex flex-col gap-0.5 {sectionIndex > 0 ? 'mt-3' : ''}" role="group">
				<p class="px-2.5 pt-1 pb-1.5 text-xs font-medium text-muted-foreground">
					{section.title}
				</p>

				{#each section.entries as entry, entryIndex (entry.id)}
					{@const index = offset + entryIndex}
					{@const isActive = index === activeIndex && !deviceStore.isMobile}

					<!-- a phone has no keyboard to move a highlight with: no row is lit there -->
					<button
						aria-selected={isActive}
						class="flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm transition-colors max-md:rounded-xl max-md:py-3 max-md:text-base {isActive
							? 'bg-accent text-accent-foreground'
							: ''}"
						id="search-result-{index}"
						onclick={entry.run}
						onmousemove={() => (highlighted = index)}
						role="option"
						tabindex={-1}
						type="button"
					>
						<entry.icon class="{ICON_CLASS_DEFAULT} shrink-0 text-muted-foreground" />

						<span class="min-w-0 flex-1 truncate">{entry.label}</span>

						{#if entry.pinned}
							<Pin aria-label="Pinned" class="{ICON_CLASS_SM} shrink-0 text-muted-foreground" />
						{/if}

						{#if entry.meta}
							<span class="max-w-[40%] shrink-0 truncate text-xs text-muted-foreground">
								{entry.meta}
							</span>
						{/if}

						{#if entry.keys && !deviceStore.isMobile}
							<KeyboardShortcutInfo class="opacity-100" keys={entry.keys} />
						{/if}

						<CornerDownLeft
							class="{ICON_CLASS_SM} shrink-0 max-md:hidden text-muted-foreground {isActive
								? 'opacity-100'
								: 'opacity-0'}"
						/>
					</button>
				{:else}
					<p class="px-2.5 py-2 text-sm text-muted-foreground max-md:py-3 max-md:text-base">
						{section.note}
					</p>
				{/each}
			</div>
		{:else}
			<p class="px-3 py-12 text-center text-sm text-muted-foreground">{emptyMessage}</p>
		{/each}
	</div>

	<div
		class="flex items-center gap-5 border-t border-border/30 px-4 py-2.5 text-xs text-muted-foreground max-md:hidden dark:border-border/20"
	>
		{@render hint('Close', ['Esc'])}

		{@render hint('Navigate', [ArrowUp, ArrowDown])}

		<span class="ml-auto">{@render hint('Open', [CornerDownLeft])}</span>
	</div>
{/snippet}

<!-- like every dialog, a phone shows it full screen -->
<Dialog.Root onOpenChange={handleOpenChange} {open}>
	<Dialog.Content
		class="top-[12%] flex h-[min(36rem,76dvh)]! w-full max-w-2xl! translate-y-0 flex-col gap-0 overflow-hidden rounded-xl p-0"
		onOpenAutoFocus={(event) => {
			event.preventDefault();
			inputRef?.focus();
		}}
	>
		<Dialog.Title class="sr-only">Search</Dialog.Title>

		{@render search()}
	</Dialog.Content>
</Dialog.Root>
