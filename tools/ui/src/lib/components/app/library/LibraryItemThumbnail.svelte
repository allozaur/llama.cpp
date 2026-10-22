<script lang="ts">
	import { LIBRARY_KIND_ICONS } from '$lib/constants';
	import type { LibraryItem } from '$lib/types';

	interface Props {
		class?: string;
		item: LibraryItem;
		/** `tile` fills a grid cell at the item's aspect ratio, `sm` is the list's square. */
		size?: 'sm' | 'tile';
	}

	let { class: className = '', item, size = 'sm' }: Props = $props();

	let Icon = $derived(LIBRARY_KIND_ICONS[item.kind]);
</script>

<!-- a stand-in for the preview until items carry one: the kind's mark on a
     muted surface, shaped like the file -->
<div
	style:aspect-ratio={size === 'tile' ? item.aspectRatio : undefined}
	class="flex shrink-0 items-center justify-center overflow-hidden bg-muted/60 text-muted-foreground {size ===
	'tile'
		? 'w-full rounded-xl'
		: 'size-8 rounded-md'} {className}"
>
	<Icon class={size === 'tile' ? 'size-8 opacity-60' : 'size-4'} />
</div>
