import Download from '@lucide/svelte/icons/download';
import Pencil from '@lucide/svelte/icons/pencil';
import Trash2 from '@lucide/svelte/icons/trash-2';
import type { MenuAction } from '#lib/types/index.ts';

/** A media item's "more actions" and right-click menu. Placeholders: nothing acts yet. */
export function libraryItemActions(): MenuAction[] {
	const noop = () => {};

	return [
		{ icon: Pencil, label: 'Rename', onclick: noop },
		{ icon: Download, label: 'Download', onclick: noop },
		{ icon: Trash2, label: 'Delete', onclick: noop, separator: true, variant: 'destructive' }
	];
}
