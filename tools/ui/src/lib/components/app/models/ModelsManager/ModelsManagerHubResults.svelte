<script lang="ts">
	import ModelCardSkeleton from '../ModelCardSkeleton.svelte';
	import { ModelsSection } from '$lib/components/app';
	import { ModelsDiscoverCard, ModelsDiscoverList } from '$lib/components/app/models/discover';
	import { DISCOVER_ICON, MODEL_CARD_GRID_CLASS } from '$lib/constants';
	import { ModelsViewMode } from '$lib/enums';
	import { modelsDiscoverStore, uiStore } from '$lib/stores';

	interface Props {
		/** The search term as typed; the store answers it once the debounce settles. */
		query: string;
	}

	let { query }: Props = $props();

	// a term the store has not answered yet is still on its way
	let pending = $derived(
		modelsDiscoverStore.searching || query.trim() !== modelsDiscoverStore.query
	);
	let results = $derived(modelsDiscoverStore.searchResults);
	let isGrid = $derived(uiStore.modelsViewMode === ModelsViewMode.GRID);

	/** Placeholders while a search is on its way. */
	const SKELETON_COUNT = 4;
</script>

{#snippet icon()}
	<DISCOVER_ICON class="size-icon-sm shrink-0" />
{/snippet}

<ModelsSection
	count={pending ? undefined : results.length}
	error={Boolean(modelsDiscoverStore.searchError)}
	{icon}
	label="On Hugging Face"
	loading={pending}
	persistKey="hub-results"
	sectionHeaderClass="m-0 rounded-lg px-2 py-2 text-[13px] font-semibold text-foreground/85 select-none transition-colors hover:bg-muted max-md:px-3"
	sticky
	stickyClass="sticky z-10 bg-muted/70 backdrop-blur-lg"
>
	<div class="pb-3">
		{#if modelsDiscoverStore.searchError && !pending}
			<p class="px-2 py-3 text-sm text-destructive max-md:px-3">
				{modelsDiscoverStore.searchError}
			</p>
		{:else if !pending && results.length === 0}
			<p class="px-2 py-3 text-sm text-muted-foreground max-md:px-3">
				No GGUF models on Hugging Face match this search.
			</p>
		{:else if isGrid}
			<div class="{MODEL_CARD_GRID_CLASS} px-2 pt-1 max-md:px-3">
				{#if pending}
					{#each Array(SKELETON_COUNT) as _, index (index)}
						<ModelCardSkeleton description />
					{/each}
				{:else}
					{#each results as model (model.id)}
						<ModelsDiscoverCard
							active={uiStore.hubModelFocus === model.id}
							{model}
							onSelect={(id) => uiStore.openHubModelDetails(id)}
						/>
					{/each}
				{/if}
			</div>
		{:else}
			<ModelsDiscoverList
				activeId={uiStore.hubModelFocus}
				loading={pending}
				loadingSkeletonRowsCount={SKELETON_COUNT}
				models={results}
				onSelect={(id) => uiStore.openHubModelDetails(id)}
				showBaseModelAvatar
			/>
		{/if}
	</div>
</ModelsSection>
