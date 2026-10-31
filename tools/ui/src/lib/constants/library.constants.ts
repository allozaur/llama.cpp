import { AudioLines, Film, Image } from '@lucide/svelte';
import { LibraryItemKind, LibraryTab } from '$lib/enums';
import type { Component } from 'svelte';

/** The mark of each kind of media item. */
export const LIBRARY_KIND_ICONS: Record<LibraryItemKind, Component> = {
	[LibraryItemKind.AUDIO]: AudioLines,
	[LibraryItemKind.IMAGE]: Image,
	[LibraryItemKind.VIDEO]: Film
};

export const LIBRARY_TABS: { label: string; value: LibraryTab }[] = [
	{ label: 'Prompts', value: LibraryTab.PROMPTS },
	{ label: 'Media', value: LibraryTab.MEDIA }
];
