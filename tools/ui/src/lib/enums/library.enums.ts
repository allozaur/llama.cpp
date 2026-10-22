/** What a library item is, which picks its mark and its file-type filter. */
export enum LibraryItemKind {
	DOCUMENT = 'document',
	FOLDER = 'folder',
	IMAGE = 'image',
	PDF = 'pdf',
	PRESENTATION = 'presentation',
	SPREADSHEET = 'spreadsheet'
}

/** Where a library item came from. */
export enum LibraryItemSource {
	GENERATED = 'generated',
	UPLOADED = 'uploaded'
}

/** The slice of the library a tab shows. */
export enum LibraryTab {
	ALL = 'all',
	FAVORITES = 'favorites',
	FOLDERS = 'folders',
	IMAGES = 'images',
	RECENT = 'recent'
}

/** How the library lays its items out. */
export enum LibraryView {
	GRID = 'grid',
	LIST = 'list'
}
