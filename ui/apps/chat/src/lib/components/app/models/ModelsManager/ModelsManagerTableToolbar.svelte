<script lang="ts">
	import ModelsManagerFilters from './ModelsManagerFilters.svelte';
	import { hasActiveFilters } from './utils';
	import { Button } from '@ggml/llama-ui/ui/button';
	import * as ToggleGroup from '@ggml/llama-ui/ui/toggle-group';
	import { LayoutGrid, List, X } from '@lucide/svelte';
	import { SearchInput } from '$lib/components/app/forms';
	import { FILTER_TOGGLE_ITEM_CLASS, type ModalityKey } from '$lib/constants';
	import { ModelCapability, ModelsViewMode } from '$lib/enums';
	import { deviceStore, serversStore, uiStore } from '$lib/stores';
	import type { Snippet } from 'svelte';

	interface Props {
		/** Capabilities a model must have every one of. */
		capabilities?: ModelCapability[];
		/** Smallest context a model must support; 0 keeps every model. */
		contextLimit?: number;
		filter?: string;
		/** Modalities a model must support at least one of. */
		modalities?: ModalityKey[];
		/** Repos each server contributes to the current search, for the filter menu. */
		serverCounts?: Record<string, number>;
		/** Server ids to keep; empty keeps every server. */
		servers?: string[];
		/** Order control, rendered past the filters; the grid's, which has no headers. */
		sortControl?: Snippet;
		/** Rendered at the toolbar's right end, past the filters. */
		toolbarEnd?: Snippet;
	}

	let {
		capabilities = $bindable<ModelCapability[]>([]),
		contextLimit = $bindable(0),
		filter = $bindable(''),
		modalities = $bindable<ModalityKey[]>([]),
		serverCounts = {},
		servers = $bindable<string[]>([]),
		sortControl,
		toolbarEnd
	}: Props = $props();

	const VIEW_MODES = [
		{ icon: List, label: 'Table', value: ModelsViewMode.TABLE },
		{ icon: LayoutGrid, label: 'Grid', value: ModelsViewMode.GRID }
	];

	let hasFilters = $derived(
		hasActiveFilters(contextLimit, modalities, capabilities) || servers.length > 0
	);
	let filterInput = $state<HTMLInputElement | null>(null);

	// The search takes the focus when the models page opens: the input mounts a frame
	// or two after the page (the toolbar renders below the table in the DOM), so the
	// poll retries until the ref lands or gives up.
	$effect(() => {
		let frames = 0;
		let handle = requestAnimationFrame(function focusFilter() {
			if (filterInput) {
				filterInput.focus({ preventScroll: true });

				return;
			}

			if (frames++ < 20) handle = requestAnimationFrame(focusFilter);
		});

		return () => cancelAnimationFrame(handle);
	});
</script>

<!-- Below md the search takes a row of its own and the filters follow it. -->
<div class="flex shrink-0 flex-wrap items-center gap-2 pb-4 max-md:gap-3 md:flex-nowrap">
	<SearchInput
		bind:ref={filterInput}
		bind:value={filter}
		class="w-full md:w-auto md:max-w-64"
		placeholder={uiStore.isDiscoverEnabled ? 'Search models or Hugging Face' : 'Search your models'}
		size={deviceStore.isMobile ? 'default' : 'sm'}
	/>

	<ModelsManagerFilters
		bind:capabilities
		bind:contextLimit
		bind:modalities
		bind:servers
		availableServers={serversStore.enabled}
		{serverCounts}
	/>

	{#if hasFilters}
		<Button
			class="gap-1.5 text-muted-foreground"
			onclick={() => {
				servers = [];
				contextLimit = 0;
				modalities = [];
				capabilities = [];
			}}
			size="sm"
			variant="ghost"
		>
			<X class="size-icon-md" />

			Clear filters
		</Button>
	{/if}

	<div class="ml-auto flex items-center gap-2">
		{@render sortControl?.()}

		<ToggleGroup.Root
			aria-label="Layout"
			onValueChange={(value) => {
				// a click on the active mode would clear the group; it keeps its mode instead
				if (value) uiStore.setModelsViewMode(value as ModelsViewMode);
			}}
			size="sm"
			type="single"
			value={uiStore.modelsViewMode}
		>
			{#each VIEW_MODES as mode (mode.value)}
				<ToggleGroup.Item
					aria-label={mode.label}
					class={FILTER_TOGGLE_ITEM_CLASS}
					title={mode.label}
					value={mode.value}
				>
					<mode.icon class="size-4" />
				</ToggleGroup.Item>
			{/each}
		</ToggleGroup.Root>

		{@render toolbarEnd?.()}
	</div>
</div>
