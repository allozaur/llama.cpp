import AudioLines from '@lucide/svelte/icons/audio-lines';
import Film from '@lucide/svelte/icons/film';
import Image from '@lucide/svelte/icons/image';
import { LibraryItemKind, LibraryTab } from '#lib/enums/index.ts';
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
