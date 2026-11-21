/** What a media item is, which picks its mark. */
export enum LibraryItemKind {
	AUDIO = 'audio',
	IMAGE = 'image',
	VIDEO = 'video'
}

/** The part of the library a tab shows. */
export enum LibraryTab {
	MEDIA = 'media',
	PROMPTS = 'prompts'
}

/** How the media tab lays its items out. */
export enum LibraryView {
	GRID = 'grid',
	LIST = 'list'
}
