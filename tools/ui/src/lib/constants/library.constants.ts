import {
	FileText,
	FileType,
	Folder,
	Image,
	Presentation,
	Sheet,
	Upload,
	WandSparkles
} from '@lucide/svelte';
import { LibraryItemKind, LibraryItemSource, LibraryTab } from '$lib/enums';
import type { Component } from 'svelte';

/** The mark of each kind of library item. */
export const LIBRARY_KIND_ICONS: Record<LibraryItemKind, Component> = {
	[LibraryItemKind.DOCUMENT]: FileText,
	[LibraryItemKind.FOLDER]: Folder,
	[LibraryItemKind.IMAGE]: Image,
	[LibraryItemKind.PDF]: FileType,
	[LibraryItemKind.PRESENTATION]: Presentation,
	[LibraryItemKind.SPREADSHEET]: Sheet
};

/** The file types the filter menu offers, in its order. Folders are a tab instead. */
export const LIBRARY_FILE_TYPE_FILTERS: { kind: LibraryItemKind; label: string }[] = [
	{ kind: LibraryItemKind.IMAGE, label: 'Images' },
	{ kind: LibraryItemKind.DOCUMENT, label: 'Documents' },
	{ kind: LibraryItemKind.SPREADSHEET, label: 'Spreadsheets' },
	{ kind: LibraryItemKind.PRESENTATION, label: 'Presentations' },
	{ kind: LibraryItemKind.PDF, label: 'PDFs' }
];

/** The sources the filter menu offers. */
export const LIBRARY_SOURCE_FILTERS: {
	icon: Component;
	label: string;
	source: LibraryItemSource;
}[] = [
	{ icon: Upload, label: 'Uploaded', source: LibraryItemSource.UPLOADED },
	{ icon: WandSparkles, label: 'Generated', source: LibraryItemSource.GENERATED }
];

export const LIBRARY_TABS: { label: string; value: LibraryTab }[] = [
	{ label: 'Recent', value: LibraryTab.RECENT },
	{ label: 'Favorites', value: LibraryTab.FAVORITES },
	{ label: 'Folders', value: LibraryTab.FOLDERS },
	{ label: 'Images', value: LibraryTab.IMAGES },
	{ label: 'All', value: LibraryTab.ALL }
];
