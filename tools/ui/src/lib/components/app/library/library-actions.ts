import { Download, Pencil, Trash2 } from '@lucide/svelte';
import type { MenuAction } from '$lib/types';

/** A media item's "more actions" and right-click menu. Placeholders: nothing acts yet. */
export function libraryItemActions(): MenuAction[] {
	const noop = () => {};

	return [
		{ icon: Pencil, label: 'Rename', onclick: noop },
		{ icon: Download, label: 'Download', onclick: noop },
		{ icon: Trash2, label: 'Delete', onclick: noop, separator: true, variant: 'destructive' }
	];
}
