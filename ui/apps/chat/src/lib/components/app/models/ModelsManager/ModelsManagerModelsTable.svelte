<script lang="ts">
	import ModelsManagerModelCard from './ModelsManagerModelCard.svelte';
	import ModelsManagerModelRow from './ModelsManagerModelRow.svelte';
	import ModelsManagerQuantRow from './ModelsManagerQuantRow.svelte';
	import ModelsManagerRepoRow from './ModelsManagerRepoRow.svelte';
	import ModelsManagerTableToolbar from './ModelsManagerTableToolbar.svelte';
	import {
		hasActiveFilters,
		modelContextLength,
		type ModelQuantGroup,
		type ModelsTableGroup
	} from './utils';
	import {
		ArrowDown,
		ArrowUp,
		ChevronDown,
		ChevronUp,
		Download,
		EyeOff,
		Heart,
		Power
	} from '@lucide/svelte';
	import {
		CollapsibleRegion,
		GroupedList,
		type GroupedListGroup,
		GroupedListUnit,
		Logo,
		ModelAvatar,
		ModelsSection
	} from '$lib/components/app';
	import { DialogConfirmDownload } from '$lib/components/app/dialogs';
	import * as Empty from '$lib/components/ui/empty';
	import * as Select from '$lib/components/ui/select';
	import {
		FAMILY_ROW_WINDOW,
		FILTER_TRIGGER_CLASS,
		type ModalityKey,
		MODEL_ICON,
		MODEL_ROW_GRID_CLASS,
		MODEL_ROW_TRAILING_CELL_CLASS,
		MODEL_ROW_WINDOW,
		MODELS_TABLE_GROUP_STICKY_OFFSET,
		SETTINGS_KEYS
	} from '$lib/constants';
	import {
		KeyboardKey,
		ModelCapability,
		ModelDownloadConfirmAction,
		ModelsTableGroupKind,
		ModelsTableServerKind,
		ModelsTableSortKey,
		ModelsViewMode
	} from '$lib/enums';
	import { modelsStore, serversModelsStore, settingsStore, uiStore } from '$lib/stores';
	import type { ModelOption } from '$lib/types/models';
	import { groupModelFamilies, type ModelFamilyGroup } from '$lib/utils/model-families';
	import type { Snippet } from 'svelte';
	import { SvelteMap, SvelteSet } from 'svelte/reactivity';

	interface Props {
		/** Capabilities a model must have every one of. */
		capabilities?: ModelCapability[];
		/** Smallest context a model must support; 0 keeps every model. */
		contextLimit?: number;
		filter?: string;
		/** Rendered after the sections, inside the scroll area: the Hub results. */
		footer?: Snippet;
		groups: ModelsTableGroup[];
		isFavorite: (option: ModelOption) => boolean;
		onSelect: (option: ModelOption) => void;
		/** Modalities a model must support at least one of. */
		modalities?: ModalityKey[];
		/** Server ids to keep; empty keeps every server. */
		servers?: string[];
		/** Repos each server contributes to the current search, for the filter menu. */
		serverCounts?: Record<string, number>;
		selectedId: string | null;
		/** Rendered at the toolbar's right end, past the filters. */
		toolbarEnd?: Snippet;
	}

	let {
		capabilities = $bindable<ModelCapability[]>([]),
		contextLimit = $bindable(0),
		filter = $bindable(''),
		footer,
		groups,
		isFavorite,
		modalities = $bindable<ModalityKey[]>([]),
		onSelect,
		selectedId,
		serverCounts = {},
		servers = $bindable<string[]>([]),
		toolbarEnd
	}: Props = $props();

	let isEmpty = $derived(groups.every((group) => group.items.length === 0));
	let isGrid = $derived(uiStore.modelsViewMode === ModelsViewMode.GRID);
	/** Cards a grid section shows before its show-more button, per section key. */
	const gridWindows = new SvelteMap<string, number>();
	let hasFilters = $derived(
		hasActiveFilters(contextLimit, modalities, capabilities) || servers.length > 0
	);

	/** Noun the show-more row counts in, per unit of the grouped list. */
	const SHOW_MORE_NOUNS: Record<GroupedListUnit, string> = {
		[GroupedListUnit.ENTRIES]: 'models',
		[GroupedListUnit.GROUPS]: 'families'
	};
	let pendingDelete = $state('');
	let pendingAction = $state(ModelDownloadConfirmAction.DELETE);
	let deleteOpen = $state(false);
	/** Repos whose quants are folded away; the rest show them. */
	const collapsedQuants = new SvelteSet<string>();
	/** Sections that list their models straight, without folding them into families. */
	const FLAT_SECTIONS = new Set<ModelsTableGroup['kind']>([
		ModelsTableGroupKind.DOWNLOADING,
		ModelsTableGroupKind.FAVORITES,
		ModelsTableGroupKind.LOADED
	]);
	let sections = $derived(
		groups.map((group) => {
			// a flat section lists its models straight, families or not
			const flat =
				FLAT_SECTIONS.has(group.kind) ||
				!settingsStore.config[SETTINGS_KEYS.GROUP_MODELS_BY_FAMILY];
			// downloads keep the feed's order: their progress, not their name, moves
			const items =
				group.kind === ModelsTableGroupKind.DOWNLOADING ? group.items : sortEntries(group.items);

			return {
				...group,
				families: flat ? [] : groupModelFamilies(items, (entry) => entry.base.model),
				flat,
				items
			};
		})
	);

	function familyGroups(
		group: (typeof sections)[number]
	): GroupedListGroup<ModelFamilyGroup<ModelQuantGroup>, ModelQuantGroup>[] {
		return group.families.map((family) => ({
			entries: family.entries,
			group: family,
			key: `${group.key}::${family.key}`
		}));
	}

	// cancel is confirmed once for the whole list, so one dialog serves every row
	function requestDelete(option: ModelOption): void {
		pendingDelete = option.model;
		// an in-flight row cancels (and drops the partials), a paused one deletes
		pendingAction = modelsStore.status.isDownloadInProgress(option.model)
			? ModelDownloadConfirmAction.CANCEL
			: ModelDownloadConfirmAction.DELETE;
		deleteOpen = true;
	}

	function toggleQuants(key: string): void {
		if (collapsedQuants.has(key)) {
			collapsedQuants.delete(key);
		} else {
			collapsedQuants.add(key);
		}
	}

	/** Column the table is ordered by; unset keeps the manager's own order. */
	let sortKey = $state<ModelsTableSortKey | null>(null);
	let sortAsc = $state(true);

	function compareEntries(left: ModelQuantGroup, right: ModelQuantGroup): number {
		const a = left.base;
		const b = right.base;

		switch (sortKey) {
			case ModelsTableSortKey.CONTEXT:
				// a context we cannot read yet sorts with the smallest ones
				return (modelContextLength(a) ?? 0) - (modelContextLength(b) ?? 0);
			case ModelsTableSortKey.NAME:
				return a.model.localeCompare(b.model);
			default:
				return 0;
		}
	}

	function sortEntries(entries: ModelQuantGroup[]): ModelQuantGroup[] {
		if (!sortKey) return entries;

		const direction = sortAsc ? 1 : -1;

		return [...entries].sort((a, b) => direction * compareEntries(a, b));
	}

	/** A click on a new column sorts lowest first, then highest first, then clears. */
	function toggleSort(key: ModelsTableSortKey): void {
		if (sortKey !== key) {
			sortKey = key;
			sortAsc = true;

			return;
		}

		if (sortAsc) {
			sortAsc = false;

			return;
		}

		sortKey = null;
	}

	function sortTitle(key: ModelsTableSortKey, label: string): string {
		const name = label.toLowerCase();

		if (sortKey !== key) return `Sort by ${name}, lowest first`;

		return sortAsc ? `Sort by ${name}, highest first` : `Stop sorting by ${name}`;
	}

	/** The grid has no column headers, so its order is picked from one menu. */
	const SORT_OPTIONS: { asc: boolean; key: ModelsTableSortKey | null; label: string }[] = [
		{ asc: true, key: null, label: 'Default' },
		{ asc: true, key: ModelsTableSortKey.NAME, label: 'Name, A to Z' },
		{ asc: false, key: ModelsTableSortKey.NAME, label: 'Name, Z to A' },
		{ asc: true, key: ModelsTableSortKey.CONTEXT, label: 'Context, smallest first' },
		{ asc: false, key: ModelsTableSortKey.CONTEXT, label: 'Context, largest first' }
	];
	const sortValue = (key: ModelsTableSortKey | null, asc: boolean) =>
		key ? `${key}:${asc ? 'asc' : 'desc'}` : 'none';
	let sortLabel = $derived(
		SORT_OPTIONS.find((option) => sortValue(option.key, option.asc) === sortValue(sortKey, sortAsc))
			?.label ?? 'Default'
	);

	function setSort(value: string): void {
		const option = SORT_OPTIONS.find((item) => sortValue(item.key, item.asc) === value);

		sortKey = option?.key ?? null;
		sortAsc = option?.asc ?? true;
	}

	/** A card per model: a repo's quants are models of their own in the grid. */
	function gridEntries(items: ModelQuantGroup[]): ModelQuantGroup[] {
		return items.flatMap((entry) =>
			entry.quants.length > 1
				? entry.quants.map((quant) => ({ ...entry, base: quant, key: quant.id, quants: [quant] }))
				: [entry]
		);
	}

	function handleFamilyKeydown(event: KeyboardEvent, toggle: () => void): void {
		if (event.key === KeyboardKey.SPACE) event.preventDefault();

		if (event.key === KeyboardKey.ENTER || event.key === KeyboardKey.SPACE) toggle();
	}
</script>

{#snippet sortHeader(key: ModelsTableSortKey, label: string)}
	<button
		class="inline-flex cursor-pointer items-center gap-1 transition-colors hover:text-foreground focus:outline-none"
		onclick={() => toggleSort(key)}
		title={sortTitle(key, label)}
		type="button"
	>
		{label}

		{#if sortKey === key}
			{#if sortAsc}
				<ArrowUp class="size-3" />
			{:else}
				<ArrowDown class="size-3" />
			{/if}
		{/if}
	</button>
{/snippet}

{#snippet entryTree(entry: ModelQuantGroup, indent = 0)}
	{#if entry.quants.length > 1}
		<ModelsManagerRepoRow
			{entry}
			expanded={!collapsedQuants.has(entry.key)}
			{indent}
			onToggle={() => toggleQuants(entry.key)}
		/>

		<CollapsibleRegion open={!collapsedQuants.has(entry.key)}>
			{#each entry.quants as quant (quant.id)}
				<ModelsManagerQuantRow
					indent={indent + 24}
					{isFavorite}
					onDelete={requestDelete}
					{onSelect}
					option={quant}
					selected={selectedId === quant.id}
					showServer={entry.kind === 'servers'}
				/>
			{/each}
		</CollapsibleRegion>
	{:else}
		<ModelsManagerModelRow
			{indent}
			{isFavorite}
			onDelete={requestDelete}
			{onSelect}
			option={entry.base}
			selected={selectedId === entry.base.id}
			sidecarBadges={entry.sidecarBadges}
		/>
	{/if}
{/snippet}

{#snippet familyRow({
	expanded,
	group: family,
	toggle
}: {
	expanded: boolean;
	group: ModelFamilyGroup<ModelQuantGroup>;
	toggle: () => void;
})}
	{@const countLabel = `${family.entries.length} model${family.entries.length === 1 ? '' : 's'}`}

	<div
		class="{MODEL_ROW_GRID_CLASS} relative group cursor-pointer rounded-md px-2 py-1.5 transition hover:bg-muted/40 max-md:px-3 max-md:py-2.5"
		onclick={toggle}
		onkeydown={(event) => handleFamilyKeydown(event, toggle)}
		role="button"
		tabindex="0"
	>
		<span class="flex min-w-0 items-center gap-3 max-md:pr-9">
			<ModelAvatar
				option={family.entries[0].base}
				showBaseModelAvatar
				showQuantBadge={false}
				size="size-6"
			/>

			<span class="truncate text-sm font-medium">{family.label}</span>

			<span class="shrink-0 text-sm whitespace-nowrap text-muted-foreground">{countLabel}</span>
		</span>

		<!-- the context and status columns stay empty here: the fold control is this
		     row's last cell, which a phone floats at the row's end -->
		<span class="max-md:hidden"></span>

		<span class="max-md:hidden"></span>

		<span
			class="flex justify-center {MODEL_ROW_TRAILING_CELL_CLASS} {expanded
				? 'opacity-0 group-hover:opacity-100 [@media(pointer:coarse)]:opacity-100'
				: ''}"
		>
			{#if expanded}
				<ChevronUp class="size-3.5 text-muted-foreground" />
			{:else}
				<ChevronDown class="size-3.5 text-muted-foreground" />
			{/if}
		</span>
	</div>
{/snippet}

{#snippet listItem({ depth, entry }: { depth: number; entry: ModelQuantGroup })}
	{@render entryTree(entry, depth > 0 ? 16 : 0)}
{/snippet}

{#snippet showMore({
	count,
	onMore,
	unit
}: {
	count: number;
	onMore: () => void;
	unit: GroupedListUnit;
})}
	<div class="px-2 max-md:px-3">
		<button
			class="w-full cursor-pointer rounded-md px-2 py-2 text-left text-xs text-muted-foreground transition hover:bg-muted/40"
			onclick={onMore}
			type="button"
		>
			Show {count} more {SHOW_MORE_NOUNS[unit]}
		</button>
	</div>
{/snippet}

{#snippet sortControl()}
	{#if isGrid}
		<Select.Root onValueChange={setSort} type="single" value={sortValue(sortKey, sortAsc)}>
			<Select.Trigger class={FILTER_TRIGGER_CLASS} size="sm">
				<span class="text-muted-foreground">Sort:</span>

				{sortLabel}
			</Select.Trigger>

			<Select.Content>
				{#each SORT_OPTIONS as option (sortValue(option.key, option.asc))}
					<Select.Item label={option.label} value={sortValue(option.key, option.asc)}>
						{option.label}
					</Select.Item>
				{/each}
			</Select.Content>
		</Select.Root>
	{/if}
{/snippet}

{#snippet cardGrid(group: (typeof sections)[number])}
	{@const cards = gridEntries(group.items)}
	{@const shown = gridWindows.get(group.key) ?? MODEL_ROW_WINDOW}

	<div class="grid grid-cols-[repeat(auto-fill,minmax(16rem,1fr))] gap-3 px-2 pt-1 max-md:px-3">
		{#each cards.slice(0, shown) as entry (entry.key)}
			<ModelsManagerModelCard
				{isFavorite}
				onDelete={requestDelete}
				{onSelect}
				option={entry.base}
				selected={selectedId === entry.base.id}
				sidecarBadges={entry.sidecarBadges}
			/>
		{/each}
	</div>

	{#if cards.length > shown}
		<div class="pt-2">
			{@render showMore({
				count: Math.min(MODEL_ROW_WINDOW, cards.length - shown),
				onMore: () => gridWindows.set(group.key, shown + MODEL_ROW_WINDOW),
				unit: GroupedListUnit.ENTRIES
			})}
		</div>
	{/if}
{/snippet}

<DialogConfirmDownload
	action={pendingAction}
	onClose={() => (deleteOpen = false)}
	open={deleteOpen}
	repoWithTag={pendingDelete}
/>

<div class="flex h-full min-h-0 flex-col">
	<ModelsManagerTableToolbar
		bind:capabilities
		bind:contextLimit
		bind:filter
		bind:modalities
		bind:servers
		{serverCounts}
		{sortControl}
		{toolbarEnd}
	/>

	<!-- the grid has no columns: its order comes from the toolbar's sort menu -->
	{#if !isGrid}
		<div
			class="{MODEL_ROW_GRID_CLASS} shrink-0 border-b border-border/30 px-2 pb-2 text-xs font-medium text-muted-foreground max-md:px-3 dark:border-border/20"
		>
			<span>{@render sortHeader(ModelsTableSortKey.NAME, 'Model')}</span>

			<span class="text-right whitespace-nowrap max-md:hidden">
				{@render sortHeader(ModelsTableSortKey.CONTEXT, 'Context')}
			</span>

			<span class="justify-self-center max-md:hidden">Status</span>

			<span class="text-center max-md:hidden">Actions</span>
		</div>
	{/if}

	<div class="mt-2 min-h-0 flex-1 overflow-y-auto">
		{#each sections as group (group.key)}
			{#if group.items.length > 0}
				{#snippet groupIcon()}
					{#if group.kind === ModelsTableGroupKind.DOWNLOADING}
						<Download class="size-3.5 shrink-0" />
					{:else if group.kind === ModelsTableGroupKind.FAVORITES}
						<Heart class="size-3.5 shrink-0" />
					{:else if group.kind === ModelsTableGroupKind.LOADED}
						<Power class="size-3.5 shrink-0" />
					{:else if group.kind === ModelsTableGroupKind.HIDDEN}
						<EyeOff class="size-3.5 shrink-0" />
					{:else if group.kind === ModelsTableGroupKind.LOCAL}
						<Logo class="shrink-0" style="--size: 0.875rem" />
					{/if}
				{/snippet}

				{@const serverState = group.serverId ? serversModelsStore.get(group.serverId) : null}

				<ModelsSection
					chevronClass="mr-7"
					count={isGrid ? gridEntries(group.items).length : group.items.length}
					defaultOpen={group.kind !== ModelsTableGroupKind.HIDDEN}
					error={Boolean(serverState?.error)}
					icon={group.kind === ModelsTableServerKind.SERVER ? undefined : groupIcon}
					label={group.label}
					loading={Boolean(serverState?.loading)}
					persistKey={group.key}
					revealChevronOnHover
					sectionHeaderClass="m-0 rounded-lg px-2 py-2 text-[13px] font-semibold text-foreground/85 select-none transition-colors hover:bg-muted max-md:px-3"
					serverId={group.kind === ModelsTableServerKind.SERVER
						? (group.serverId ?? undefined)
						: undefined}
					sticky
					stickyClass="sticky z-10 bg-muted/70 backdrop-blur-lg"
				>
					<!-- a little air before the next section's band -->
					<div class="pb-3">
						{#if isGrid}
							{@render cardGrid(group)}
						{:else}
							<GroupedList
								group={familyRow}
								groupWindow={FAMILY_ROW_WINDOW}
								groups={group.flat ? null : familyGroups(group)}
								initialCollapsed={modelsStore.collapsedGroupsUnder(group.key)}
								item={listItem}
								items={group.flat ? group.items : []}
								keyOf={(entry) => entry.key}
								more={showMore}
								onCollapsedChange={(key, collapsed) =>
									modelsStore.setGroupCollapsed(group.key, key, collapsed)}
								sectionWindow={MODEL_ROW_WINDOW}
								stickyClass="rounded-lg bg-muted/25 backdrop-blur-lg"
								stickyStyle={MODELS_TABLE_GROUP_STICKY_OFFSET}
								weightOf={(entry) => entry.quants.length}
							/>
						{/if}
					</div>
				</ModelsSection>
			{/if}
		{/each}

		<!-- with the Hub results below, an empty local list is a line, not the page's state -->
		{#if isEmpty && footer}
			<p class="px-2 py-3 text-sm text-muted-foreground max-md:px-3">
				{hasFilters || filter.trim() ? 'No local models match.' : 'No local models yet.'}
			</p>
		{:else if isEmpty}
			<Empty.Root class="py-16">
				<Empty.Header>
					<Empty.Media variant="icon">
						<MODEL_ICON />
					</Empty.Media>

					<Empty.Title>{hasFilters ? 'No matching models' : 'No models yet'}</Empty.Title>

					<Empty.Description>
						{hasFilters
							? 'Try a different search or clear the filters.'
							: 'Models the server can run show up here.'}
					</Empty.Description>
				</Empty.Header>
			</Empty.Root>
		{/if}

		{@render footer?.()}
	</div>
</div>
