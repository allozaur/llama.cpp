import type { LibraryItemKind } from '$lib/enums';

/** An image, video or audio clip in the library. */
export interface LibraryItem {
	id: string;
	name: string;
	kind: LibraryItemKind;
	/** Epoch ms of the last change. */
	updatedAt: number;
	/** Width over height of the grid tile, from the image when there is one. */
	aspectRatio: number;
}
