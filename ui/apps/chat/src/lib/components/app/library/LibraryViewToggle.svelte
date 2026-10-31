<script lang="ts">
	import { LayoutGrid, List } from '@lucide/svelte';
	import * as ToggleGroup from '$lib/components/ui/toggle-group';
	import { FILTER_TOGGLE_ITEM_CLASS } from '$lib/constants';
	import { LibraryView } from '$lib/enums';

	interface Props {
		view?: LibraryView;
	}

	let { view = $bindable(LibraryView.LIST) }: Props = $props();
</script>

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
