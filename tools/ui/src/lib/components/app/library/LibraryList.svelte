<script lang="ts">
	import { libraryItemActions } from './library-actions';
	import LibraryItemThumbnail from './LibraryItemThumbnail.svelte';
	import { MoreHorizontal } from '@lucide/svelte';
	import { ContextMenuActions, DropdownMenuActions } from '$lib/components/app';
	import type { LibraryItem } from '$lib/types';
	import { formatRelativeTime } from '$lib/utils';

	interface Props {
		items: LibraryItem[];
	}

	let { items }: Props = $props();

	const ROW_GRID_CLASS =
		'grid grid-cols-[minmax(0,1fr)_2rem] md:grid-cols-[minmax(0,1fr)_11rem_2rem] items-center gap-4';
</script>

<div class="flex flex-col">
	<div
		class="{ROW_GRID_CLASS} border-b border-border/40 px-2 pb-2 text-xs font-medium text-muted-foreground"
	>
		<span>Name</span>

		<span class="max-md:hidden">Last activity</span>
	</div>

	<ul class="flex flex-col">
		{#each items as item (item.id)}
			<li>
				<ContextMenuActions actions={libraryItemActions()}>
					<div
						class="group {ROW_GRID_CLASS} cursor-pointer border-b border-border/40 px-2 py-2.5 transition-colors hover:bg-muted/40"
					>
						<div class="flex min-w-0 items-center gap-3">
							<LibraryItemThumbnail {item} />

							<span class="truncate text-sm">{item.name}</span>
						</div>

						<span class="text-sm text-muted-foreground max-md:hidden">
							Modified {formatRelativeTime(item.updatedAt)}
						</span>

						<div
							class="flex justify-end opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 max-md:opacity-100"
						>
							<DropdownMenuActions
								actions={libraryItemActions()}
								triggerIcon={MoreHorizontal}
								triggerTooltip="More actions"
							/>
						</div>
					</div>
				</ContextMenuActions>
			</li>
		{/each}
	</ul>
</div>
