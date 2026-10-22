import { Download, Pencil, Star, StarOff, Trash2 } from '@lucide/svelte';
import type { LibraryItem, MenuAction } from '$lib/types';

/** An item's "more actions" and right-click menu. Placeholders: nothing acts yet. */
export function libraryItemActions(item: LibraryItem): MenuAction[] {
	const noop = () => {};

	return [
		{
			icon: item.favorite ? StarOff : Star,
			label: item.favorite ? 'Remove from favorites' : 'Add to favorites',
			onclick: noop
		},
		{ icon: Pencil, label: 'Rename', onclick: noop },
		{ icon: Download, label: 'Download', onclick: noop },
		{ icon: Trash2, label: 'Delete', onclick: noop, separator: true, variant: 'destructive' }
	];
}
