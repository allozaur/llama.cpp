<script lang="ts">
	import ModelsDiscoverListItem from './ModelsDiscoverList/ModelsDiscoverListItem.svelte';
	import { Button } from '@ggml-org/llama-ui/ui/button';
	import { ChevronLeft, Download } from '@lucide/svelte';
	import { DialogConfirmDownload } from '#lib/components/app/dialogs/index.ts';
	import { ModelsSection } from '#lib/components/app/index.ts';
	import {
		ModelsDiscoverDetailsContainer,
		ModelsDiscoverList,
		ModelsDiscoverListSearch
	} from '#lib/components/app/models/discover/index.ts';
	import { ModelDownloadConfirmAction } from '#lib/enums/index.ts';
	import { HuggingFaceService } from '#lib/services/index.ts';
	import { modelsDiscoverStore, modelsStore, uiStore } from '#lib/stores/index.ts';
	import type { HfModelInfo } from '#lib/types/index.ts';
	import { repoOf } from '#lib/utils/index.ts';
	import { untrack } from 'svelte';

	let selectedId = $state<string | null>(null);
	let searchQuery = $state('');
	// A phone shows one view at a time: the search with its results (suggested models
	// while the query is empty), or the details of the model picked from them. The
	// list stays mounted behind the details, so the query, results and scroll survive
	// the way back.
	let detailsOpen = $state(false);
	let detailsPane = $state<HTMLElement | null>(null);

	function openDetails(id: string) {
		selectedId = id;
		detailsOpen = true;
		detailsPane?.scrollTo({ top: 0 });
	}
	// running and paused downloads both lead the list, with or without a search query
	let downloadEntries = $derived(modelsStore.status.getDownloadEntries());

	let isSearching = $derived(searchQuery.trim().length > 0);

	// a search hit that is downloading already sits under Downloading, so it is listed once
	let listedModels = $derived.by(() => {
		if (!isSearching) return modelsDiscoverStore.models;

		const downloading = new Set(downloadEntries.map((entry) => repoOf(entry.repoWithTag)));

		return modelsDiscoverStore.models.filter((model) => !downloading.has(model.id));
	});

	/** Hub record for a repo the list does not carry, so its row still renders. */
	function hubRecord(id: string): HfModelInfo {
		return {
			_id: id,
			downloads: 0,
			id,
			library_name: null,
			likes: 0,
			modelId: id,
			pipeline_tag: null,
			private: false,
			tags: []
		};
	}

	// Hub records of repos the list does not carry, e.g. a download started from a
	// search hit: fetched once so the row shows the same badges and icons as a result.
	let fetchedRecords = $state<Record<string, HfModelInfo>>({});

	/** Record of a repo: what the list fetched, else its own details, else a bare one. */
	function recordOf(repo: string): HfModelInfo {
		return (
			modelsDiscoverStore.models.find((model) => model.id === repo) ??
			fetchedRecords[repo] ??
			hubRecord(repo)
		);
	}

	$effect(() => {
		for (const entry of downloadEntries) {
			const repo = repoOf(entry.repoWithTag);

			if (fetchedRecords[repo] || modelsDiscoverStore.models.some((m) => m.id === repo)) continue;

			void HuggingFaceService.getDetails(repo).then((details) => {
				if (details) fetchedRecords = { ...fetchedRecords, [repo]: details };
			});
		}
	});

	// cancel is confirmed once, so a single dialog serves every download row; the
	// target is kept while the dialog closes so its copy stays rendered
	let pendingCancel = $state('');
	let cancelOpen = $state(false);

	function requestCancel(repoWithTag: string) {
		pendingCancel = repoWithTag;
		cancelOpen = true;
	}

	let searchTimeout: ReturnType<typeof setTimeout> | null = null;

	// load the list on mount; untrack because fetch() toggles its loading flag
	// synchronously, and tracking it would re-run the effect on every toggle - an
	// endless retry while a repo stays failed
	$effect(() => {
		untrack(() => {
			void modelsDiscoverStore.fetch();
			void modelsDiscoverStore.search('');
		});
	});

	$effect(() => {
		const first = modelsDiscoverStore.firstModel;

		if (!selectedId && first) {
			selectedId = first.id;
		}
	});

	// a caller can ask for one repo to be opened, the manager's rows do
	$effect(() => {
		const focus = uiStore.discoverModelFocus;

		if (!focus) return;

		openDetails(focus);
		uiStore.discoverModelFocus = null;
	});

	function handleSearchInput(value: string) {
		searchQuery = value;

		if (searchTimeout) clearTimeout(searchTimeout);

		searchTimeout = setTimeout(() => {
			void modelsDiscoverStore.search(value);
		}, 300);
	}
</script>

{#snippet catalog()}
	<ModelsDiscoverList
		activeId={selectedId}
		loading={modelsDiscoverStore.loading || modelsDiscoverStore.searching}
		models={listedModels}
		onSelect={openDetails}
		showBaseModelAvatar
	/>
{/snippet}

<aside
	class={[
		'h-full w-full shrink-0 space-y-4 self-start overflow-y-auto bg-background md:w-md md:border-r md:border-border/40 md:pr-4',
		detailsOpen && 'max-md:hidden'
	]}
>
	<ModelsDiscoverListSearch bind:value={searchQuery} onSearch={handleSearchInput} />

	{#if downloadEntries.length > 0}
		<ModelsSection
			count={downloadEntries.length}
			label="Downloading"
			persistKey="discover-downloads"
			sticky
			stickyClass="sticky z-10 bg-background"
		>
			{#snippet icon()}
				<Download class="size-icon-sm shrink-0" />
			{/snippet}

			{#each downloadEntries as entry (entry.repoWithTag)}
				{@const repo = repoOf(entry.repoWithTag)}

				<!-- the row is the list's own, so a download opens the same details pane a
				     result does; only the state line and the trailing control differ -->
				<ModelsDiscoverListItem
					active={repo === selectedId}
					download={{
						isPaused: entry.isPaused,
						onRequestCancel: requestCancel,
						progress: entry.progress,
						repoWithTag: entry.repoWithTag
					}}
					model={recordOf(repo)}
					onSelect={openDetails}
					showBaseModelAvatar
					sidecarBadges={modelsStore.status.getDraftSidecars(repo)}
				/>
			{/each}
		</ModelsSection>
	{/if}

	<!-- One list instance, so the rows keep their state across search round trips;
		 skeleton rows replace them while the initial catalog or a query loads. -->
	<div>
		{#if modelsDiscoverStore.error}
			<div class="flex flex-col items-start gap-2 p-4">
				<p class="text-body-sm text-destructive">{modelsDiscoverStore.error}</p>

				<Button onclick={() => void modelsDiscoverStore.fetch()} size="sm" variant="outline">
					Retry
				</Button>
			</div>
		{:else if !modelsDiscoverStore.loading && !modelsDiscoverStore.searching && modelsDiscoverStore.models.length === 0}
			<p class="p-4 text-body-sm text-muted-foreground">No models found</p>
		{:else}
			{#if isSearching}
				{@render catalog()}
			{:else}
				<ModelsSection
					count={modelsDiscoverStore.models.length}
					label="Suggested models"
					persistKey="discover-suggested"
					sticky
					stickyClass="sticky z-10 bg-background"
				>
					{@render catalog()}
				</ModelsSection>
			{/if}
		{/if}
	</div>
</aside>

<main bind:this={detailsPane} class={['overflow-y-auto', !detailsOpen && 'max-md:hidden']}>
	{#if selectedId}
		<!-- a phone reaches the details from the list, so it gets a way back to it -->
		<div class="sticky top-0 z-20 -mx-1 bg-background pb-2 md:hidden">
			<Button class="gap-1 px-2" onclick={() => (detailsOpen = false)} size="sm" variant="ghost">
				<ChevronLeft class="size-icon-md" />

				{isSearching ? 'Search results' : 'Suggested models'}
			</Button>
		</div>

		<ModelsDiscoverDetailsContainer modelId={selectedId} />
	{/if}
</main>

<DialogConfirmDownload
	action={ModelDownloadConfirmAction.CANCEL}
	onClose={() => (cancelOpen = false)}
	onConfirm={() => void modelsStore.status.cancelDownload(pendingCancel)}
	open={cancelOpen}
	repoWithTag={pendingCancel}
/>
