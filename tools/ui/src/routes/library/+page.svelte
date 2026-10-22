<script lang="ts">
	import { Library } from '@lucide/svelte';
	import {
		LIBRARY_MOCK_ITEMS,
		LibraryGrid,
		LibraryList,
		LibraryToolbar
	} from '$lib/components/app';
	import * as Empty from '$lib/components/ui/empty';
	import { APP_NAME, LIBRARY_TABS } from '$lib/constants';
	import { LibraryItemKind, type LibraryItemSource, LibraryTab, LibraryView } from '$lib/enums';

	let tab = $state(LibraryTab.RECENT);
	let view = $state(LibraryView.LIST);
	let query = $state('');
	let kinds = $state<LibraryItemKind[]>([]);
	let sources = $state<LibraryItemSource[]>([]);

	// a mock-up: the tabs, search and filters narrow the placeholder items
	let items = $derived(
		LIBRARY_MOCK_ITEMS.filter((item) => {
			if (tab === LibraryTab.FAVORITES && !item.favorite) return false;

			if (tab === LibraryTab.FOLDERS && item.kind !== LibraryItemKind.FOLDER) return false;

			if (tab === LibraryTab.IMAGES && item.kind !== LibraryItemKind.IMAGE) return false;

			if (kinds.length > 0 && !kinds.includes(item.kind)) return false;

			if (sources.length > 0 && !sources.includes(item.source)) return false;

			return item.name.toLowerCase().includes(query.trim().toLowerCase());
		}).sort((a, b) => b.updatedAt - a.updatedAt)
	);
</script>

<svelte:head>
	<title>Library · {APP_NAME}</title>
</svelte:head>

<div
	class="page-enter mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 pt-12 pb-16 md:px-8 md:pt-6"
>
	<div class="flex flex-wrap items-start gap-4">
		<div class="flex min-w-0 flex-col gap-1">
			<h1 class="text-2xl font-semibold tracking-tight">Library</h1>

			<p class="text-sm text-muted-foreground">Files from your chats and projects, in one place.</p>
		</div>

		<div class="ml-auto max-sm:w-full">
			<LibraryToolbar bind:kinds bind:query bind:sources bind:view />
		</div>
	</div>

	<div class="flex flex-wrap gap-1" role="tablist">
		{#each LIBRARY_TABS as entry (entry.value)}
			<button
				aria-selected={tab === entry.value}
				class="h-8 cursor-pointer rounded-full px-3.5 text-sm transition-colors {tab === entry.value
					? 'bg-muted font-medium text-foreground'
					: 'text-muted-foreground hover:text-foreground'}"
				onclick={() => (tab = entry.value)}
				role="tab"
				type="button"
			>
				{entry.label}
			</button>
		{/each}
	</div>

	{#if items.length === 0}
		<Empty.Root class="border py-16">
			<Empty.Header>
				<Empty.Media variant="icon">
					<Library />
				</Empty.Media>

				<Empty.Title>Nothing matches</Empty.Title>

				<Empty.Description>Try another tab, filter or search.</Empty.Description>
			</Empty.Header>
		</Empty.Root>
	{:else if view === LibraryView.GRID}
		<LibraryGrid {items} />
	{:else}
		<LibraryList {items} />
	{/if}
</div>
