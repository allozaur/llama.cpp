<script lang="ts">
	import ModelsDiscoverDetailsContainer from './ModelsDiscoverDetailsContainer.svelte';
	import { X } from '@lucide/svelte';
	import { ActionIcon } from '$lib/components/app';
	import * as Drawer from '$lib/components/ui/drawer';
	import { DISCOVER_ICON } from '$lib/constants';
	import { deviceStore, uiStore } from '$lib/stores';
	import { untrack } from 'svelte';

	let focus = $derived(uiStore.hubModelFocus);
	// keep the last repo on screen while the drawer closes
	let shownId = $state<string | null>(null);

	$effect(() => {
		const repo = focus;

		if (!repo) return;

		untrack(() => (shownId = repo));
	});

	// the setting can be turned off while the drawer is open: it closes with it
	$effect(() => {
		if (focus && !uiStore.isDiscoverEnabled) untrack(() => uiStore.closeHubModelDetails());
	});
</script>

<!-- bound both ways: vaul writes its own open state on a drag to dismiss -->
<Drawer.Root
	bind:open={
		() => focus !== null,
		(open) => {
			if (!open) uiStore.closeHubModelDetails();
		}
	}
	direction={deviceStore.isMobile ? 'bottom' : 'right'}
	shouldScaleBackground={false}
>
	<Drawer.Content
		class="data-[vaul-drawer-direction=bottom]:h-[85dvh] data-[vaul-drawer-direction=bottom]:max-h-[85dvh] data-[vaul-drawer-direction=right]:w-[48rem] data-[vaul-drawer-direction=right]:max-w-[calc(100vw-2rem)] data-[vaul-drawer-direction=right]:sm:max-w-[48rem]"
	>
		<div class="flex shrink-0 items-center gap-2 border-b border-border/40 px-6 py-3">
			<DISCOVER_ICON class="size-4 text-muted-foreground" />

			<Drawer.Title class="text-sm font-medium">Hugging Face</Drawer.Title>

			<Drawer.Description class="sr-only">
				Details of a Hugging Face model and the files it can be downloaded as.
			</Drawer.Description>

			<ActionIcon
				ariaLabel="Close"
				class="ml-auto"
				icon={X}
				iconSize="size-4"
				onclick={() => uiStore.closeHubModelDetails()}
				tooltip="Close"
				tooltipAsTitle
			/>
		</div>

		<div class="min-h-0 flex-1 overflow-y-auto">
			{#if shownId}
				<ModelsDiscoverDetailsContainer modelId={shownId} />
			{/if}
		</div>
	</Drawer.Content>
</Drawer.Root>
