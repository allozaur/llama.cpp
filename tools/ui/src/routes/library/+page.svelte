<script lang="ts">
	import { Library, Plus } from '@lucide/svelte';
	import {
		LIBRARY_MOCK_ITEMS,
		LibraryGrid,
		LibraryList,
		LibraryPrompts,
		LibraryViewToggle,
		SearchInput
	} from '$lib/components/app';
	import { Button } from '$lib/components/ui/button';
	import * as Empty from '$lib/components/ui/empty';
	import { APP_NAME, LIBRARY_TABS } from '$lib/constants';
	import { LibraryTab, LibraryView } from '$lib/enums';

	let tab = $state(LibraryTab.PROMPTS);
	let view = $state(LibraryView.GRID);
	let query = $state('');
	let creatingPrompt = $state(false);

	// a mock-up: the search narrows the placeholder media
	let media = $derived(
		LIBRARY_MOCK_ITEMS.filter((item) =>
			item.name.toLowerCase().includes(query.trim().toLowerCase())
		).sort((a, b) => b.updatedAt - a.updatedAt)
	);
</script>

<svelte:head>
	<title>Library - {APP_NAME}</title>
</svelte:head>

<div
	class="page-enter mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 pt-12 pb-16 md:px-8 md:pt-6"
>
	<div class="flex flex-wrap items-start gap-4">
		<div class="flex min-w-0 flex-col gap-1">
			<h1 class="text-2xl font-semibold tracking-tight">Library</h1>

			<p class="text-sm text-muted-foreground">
				Prompts you reuse and media from your chats, in one place.
			</p>
		</div>

		{#if tab === LibraryTab.PROMPTS}
			<Button class="ml-auto shrink-0 gap-1.5" onclick={() => (creatingPrompt = true)} size="sm">
				<Plus class="h-3.5 w-3.5" />

				New prompt
			</Button>
		{/if}
	</div>

	<div class="flex flex-wrap items-center gap-2">
		<!-- the selected tab is a secondary button, the other a ghost one, as on Projects -->
		<div class="flex gap-1" role="tablist">
			{#each LIBRARY_TABS as entry (entry.value)}
				{@const selected = tab === entry.value}

				<Button
					aria-selected={selected}
					class={selected ? '' : 'text-muted-foreground'}
					onclick={() => (tab = entry.value)}
					role="tab"
					size="sm"
					variant={selected ? 'secondary' : 'ghost'}
				>
					{entry.label}
				</Button>
			{/each}
		</div>

		<div class="ml-auto flex items-center gap-2 max-sm:w-full">
			{#if tab === LibraryTab.MEDIA}
				<LibraryViewToggle bind:view />
			{/if}

			<SearchInput
				bind:value={query}
				class="w-full sm:w-64"
				placeholder={tab === LibraryTab.PROMPTS ? 'Search prompts' : 'Search media'}
				size="sm"
			/>
		</div>
	</div>

	{#if tab === LibraryTab.PROMPTS}
		<LibraryPrompts bind:creating={creatingPrompt} {query} />
	{:else if media.length === 0}
		<Empty.Root class="border py-16">
			<Empty.Header>
				<Empty.Media variant="icon">
					<Library />
				</Empty.Media>

				<Empty.Title>Nothing matches</Empty.Title>

				<Empty.Description>Try another search.</Empty.Description>
			</Empty.Header>
		</Empty.Root>
	{:else if view === LibraryView.GRID}
		<LibraryGrid items={media} />
	{:else}
		<LibraryList items={media} />
	{/if}
</div>
