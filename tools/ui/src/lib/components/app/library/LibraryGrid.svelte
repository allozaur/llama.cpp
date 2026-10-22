<script lang="ts">
	import { libraryItemActions } from './library-actions';
	import LibraryItemThumbnail from './LibraryItemThumbnail.svelte';
	import { MoreHorizontal, Star } from '@lucide/svelte';
	import { ContextMenuActions, DropdownMenuActions } from '$lib/components/app';
	import type { LibraryItem } from '$lib/types';

	interface Props {
		items: LibraryItem[];
	}

	let { items }: Props = $props();
</script>

<!-- columns keep each tile at its own height, so the grid packs like a wall of
     previews rather than a table of equal cells -->
<ul class="columns-2 gap-4 sm:columns-3 lg:columns-4 xl:columns-5">
	{#each items as item (item.id)}
		<li class="mb-4 break-inside-avoid">
			<ContextMenuActions actions={libraryItemActions(item)}>
				<div class="group relative flex cursor-pointer flex-col gap-2">
					<LibraryItemThumbnail class="transition-colors group-hover:bg-muted" {item} size="tile" />

					<div class="flex min-w-0 items-center gap-1.5 px-0.5">
						{#if item.favorite}
							<Star
								aria-label="Favorite"
								class="size-3 shrink-0 fill-current text-muted-foreground"
							/>
						{/if}

						<span class="truncate text-xs text-muted-foreground group-hover:text-foreground">
							{item.name}
						</span>
					</div>

					<div
						class="absolute top-2 right-2 rounded-md bg-background/80 opacity-0 backdrop-blur transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 max-md:opacity-100"
					>
						<DropdownMenuActions
							actions={libraryItemActions(item)}
							triggerIcon={MoreHorizontal}
							triggerTooltip="More actions"
						/>
					</div>
				</div>
			</ContextMenuActions>
		</li>
	{/each}
</ul>
