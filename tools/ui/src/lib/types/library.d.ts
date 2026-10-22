import type { LibraryItemKind, LibraryItemSource } from '$lib/enums';

/** A file or folder in the library. */
export interface LibraryItem {
	id: string;
	name: string;
	kind: LibraryItemKind;
	source: LibraryItemSource;
	favorite: boolean;
	/** Epoch ms of the last change. */
	updatedAt: number;
	/** Width over height of the grid tile, from the image when there is one. */
	aspectRatio: number;
}
