<script lang="ts">
	import ModelCardSkeleton from '../ModelCardSkeleton.svelte';
	import ModelsDiscoverCard from './ModelsDiscoverCard.svelte';
	import { Sparkles } from '@lucide/svelte';
	import { ModelsSection, ScrollCarousel } from '$lib/components/app';
	import { Button } from '$lib/components/ui/button';
	import { MODEL_CARD_CAROUSEL_CLASS } from '$lib/constants';
	import { modelsDiscoverStore, uiStore } from '$lib/stores';
	import { untrack } from 'svelte';

	/** Placeholder cards while the first catalog batch is on its way. */
	const SKELETON_CARDS = 4;

	let models = $derived(modelsDiscoverStore.suggested);
	let isFirstLoad = $derived(modelsDiscoverStore.loading && models.length === 0);

	// untracked: fetch() toggles its loading flag synchronously, and tracking it would
	// re-run the effect on every toggle - an endless retry while a repo stays failed
	$effect(() => {
		untrack(() => void modelsDiscoverStore.fetch());
	});
</script>

{#snippet icon()}
	<Sparkles class="size-3.5 shrink-0" />
{/snippet}

<ModelsSection
	count={isFirstLoad ? undefined : models.length}
	error={Boolean(modelsDiscoverStore.error)}
	{icon}
	label="Suggested models"
	loading={modelsDiscoverStore.loading}
	persistKey="discover-suggested"
	sectionHeaderClass="m-0 rounded-lg px-2 py-2 text-[13px] font-semibold text-foreground/85 select-none transition-colors hover:bg-muted max-md:px-3"
>
	{#if modelsDiscoverStore.error && models.length === 0}
		<div class="flex items-center gap-3 px-2 py-3 max-md:px-3">
			<p class="text-sm text-destructive">{modelsDiscoverStore.error}</p>

			<Button onclick={() => void modelsDiscoverStore.fetch()} size="sm" variant="outline">
				Retry
			</Button>
		</div>
	{:else}
		<ScrollCarousel
			class="pt-1 pb-4"
			containerClass="w-full snap-x snap-mandatory scroll-px-2 px-2 max-md:px-3"
		>
			{#if isFirstLoad}
				{#each Array(SKELETON_CARDS) as _, index (index)}
					<ModelCardSkeleton class={MODEL_CARD_CAROUSEL_CLASS} description />
				{/each}
			{:else}
				{#each models as model (model.id)}
					<ModelsDiscoverCard
						active={uiStore.hubModelFocus === model.id}
						class={MODEL_CARD_CAROUSEL_CLASS}
						{model}
						onSelect={(id) => uiStore.openHubModelDetails(id)}
					/>
				{/each}
			{/if}
		</ScrollCarousel>
	{/if}
</ModelsSection>
