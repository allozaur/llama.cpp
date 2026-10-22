<script lang="ts">
	import { ChevronDown, FolderPlus, LayoutGrid, List, ListFilter, Upload } from '@lucide/svelte';
	import { SearchInput } from '$lib/components/app';
	import { Button } from '$lib/components/ui/button';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import * as ToggleGroup from '$lib/components/ui/toggle-group';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import {
		FILTER_TOGGLE_ITEM_CLASS,
		LIBRARY_FILE_TYPE_FILTERS,
		LIBRARY_KIND_ICONS,
		LIBRARY_SOURCE_FILTERS
	} from '$lib/constants';
	import { type LibraryItemKind, type LibraryItemSource, LibraryView } from '$lib/enums';

	interface Props {
		kinds?: LibraryItemKind[];
		query?: string;
		sources?: LibraryItemSource[];
		view?: LibraryView;
	}

	let {
		kinds = $bindable([]),
		query = $bindable(''),
		sources = $bindable([]),
		view = $bindable(LibraryView.LIST)
	}: Props = $props();

	let activeFilterCount = $derived(kinds.length + sources.length);

	function toggle<T>(list: T[], value: T, checked: boolean): T[] {
		return checked ? [...list, value] : list.filter((entry) => entry !== value);
	}
</script>

<div class="flex flex-wrap items-center gap-2">
	<DropdownMenu.Root>
		<Tooltip.Root>
			<Tooltip.Trigger>
				{#snippet child({ props })}
					<DropdownMenu.Trigger {...props}>
						{#snippet child({ props: triggerProps })}
							<Button
								{...triggerProps}
								aria-label="Filter"
								class="relative"
								size="icon-sm"
								variant="ghost"
							>
								<ListFilter class="size-4" />

								{#if activeFilterCount > 0}
									<span
										class="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-foreground text-[10px] font-medium text-background"
									>
										{activeFilterCount}
									</span>
								{/if}
							</Button>
						{/snippet}
					</DropdownMenu.Trigger>
				{/snippet}
			</Tooltip.Trigger>

			<Tooltip.Content>
				<p>Filter</p>
			</Tooltip.Content>
		</Tooltip.Root>

		<DropdownMenu.Content align="end" class="w-52">
			<DropdownMenu.Label class="text-xs font-medium text-muted-foreground"
				>File type</DropdownMenu.Label
			>

			{#each LIBRARY_FILE_TYPE_FILTERS as filter (filter.kind)}
				{@const Icon = LIBRARY_KIND_ICONS[filter.kind]}

				<DropdownMenu.CheckboxItem
					checked={kinds.includes(filter.kind)}
					closeOnSelect={false}
					onCheckedChange={(checked) => (kinds = toggle(kinds, filter.kind, checked))}
				>
					<Icon class="text-muted-foreground" />

					{filter.label}
				</DropdownMenu.CheckboxItem>
			{/each}

			<DropdownMenu.Separator />

			<DropdownMenu.Label class="text-xs font-medium text-muted-foreground"
				>Source</DropdownMenu.Label
			>

			{#each LIBRARY_SOURCE_FILTERS as filter (filter.source)}
				<DropdownMenu.CheckboxItem
					checked={sources.includes(filter.source)}
					closeOnSelect={false}
					onCheckedChange={(checked) => (sources = toggle(sources, filter.source, checked))}
				>
					<filter.icon class="text-muted-foreground" />

					{filter.label}
				</DropdownMenu.CheckboxItem>
			{/each}
		</DropdownMenu.Content>
	</DropdownMenu.Root>

	<ToggleGroup.Root
		class="border border-border/30 bg-muted/60 shadow-sm dark:border-border/20 dark:bg-muted/75"
		onValueChange={(value) => {
			// a single toggle group lets the active item be pressed off: keep a view
			if (value) view = value as LibraryView;
		}}
		size="sm"
		type="single"
		value={view}
	>
		<ToggleGroup.Item
			aria-label="Grid view"
			class={FILTER_TOGGLE_ITEM_CLASS}
			title="Grid view"
			value={LibraryView.GRID}
		>
			<LayoutGrid class="size-3.5" />
		</ToggleGroup.Item>

		<ToggleGroup.Item
			aria-label="List view"
			class={FILTER_TOGGLE_ITEM_CLASS}
			title="List view"
			value={LibraryView.LIST}
		>
			<List class="size-3.5" />
		</ToggleGroup.Item>
	</ToggleGroup.Root>

	<SearchInput bind:value={query} class="w-full sm:w-64" placeholder="Search library" size="sm" />

	<DropdownMenu.Root>
		<DropdownMenu.Trigger>
			{#snippet child({ props })}
				<Button {...props} class="gap-1" size="sm">
					New

					<ChevronDown class="size-3.5" />
				</Button>
			{/snippet}
		</DropdownMenu.Trigger>

		<DropdownMenu.Content align="end" class="w-44">
			<DropdownMenu.Item>
				<Upload />

				Upload files
			</DropdownMenu.Item>

			<DropdownMenu.Item>
				<FolderPlus />

				New folder
			</DropdownMenu.Item>
		</DropdownMenu.Content>
	</DropdownMenu.Root>
</div>
