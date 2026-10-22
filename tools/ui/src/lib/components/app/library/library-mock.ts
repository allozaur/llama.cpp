import { LibraryItemKind, LibraryItemSource } from '$lib/enums';
import type { LibraryItem } from '$lib/types';

const DAY = 24 * 60 * 60 * 1000;
const now = Date.now();

/**
 * Placeholder items for the Library mock-up, until the library has a source
 * of its own. Shapes and timestamps vary so both layouts can be judged.
 */
export const LIBRARY_MOCK_ITEMS: LibraryItem[] = [
	{
		aspectRatio: 4 / 3,
		favorite: true,
		id: 'm1',
		kind: LibraryItemKind.IMAGE,
		name: 'Cozy developer workspace by sunny windows.png',
		source: LibraryItemSource.GENERATED,
		updatedAt: now - 2 * 60 * 60 * 1000
	},
	{
		aspectRatio: 1,
		favorite: false,
		id: 'm2',
		kind: LibraryItemKind.FOLDER,
		name: 'Benchmarks',
		source: LibraryItemSource.UPLOADED,
		updatedAt: now - 5 * 60 * 60 * 1000
	},
	{
		aspectRatio: 3 / 4,
		favorite: false,
		id: 'm3',
		kind: LibraryItemKind.PDF,
		name: 'GGUF format specification.pdf',
		source: LibraryItemSource.UPLOADED,
		updatedAt: now - 1 * DAY
	},
	{
		aspectRatio: 4 / 3,
		favorite: false,
		id: 'm4',
		kind: LibraryItemKind.IMAGE,
		name: 'Minimal dual-monitor workspace with plants.png',
		source: LibraryItemSource.GENERATED,
		updatedAt: now - 2 * DAY
	},
	{
		aspectRatio: 3 / 4,
		favorite: true,
		id: 'm5',
		kind: LibraryItemKind.DOCUMENT,
		name: 'Release notes draft.md',
		source: LibraryItemSource.GENERATED,
		updatedAt: now - 3 * DAY
	},
	{
		aspectRatio: 4 / 3,
		favorite: false,
		id: 'm6',
		kind: LibraryItemKind.SPREADSHEET,
		name: 'Quantization perplexity results.csv',
		source: LibraryItemSource.UPLOADED,
		updatedAt: now - 4 * DAY
	},
	{
		aspectRatio: 3 / 4,
		favorite: false,
		id: 'm7',
		kind: LibraryItemKind.IMAGE,
		name: 'Studio monitor, front view.jpeg',
		source: LibraryItemSource.UPLOADED,
		updatedAt: now - 6 * DAY
	},
	{
		aspectRatio: 16 / 9,
		favorite: false,
		id: 'm8',
		kind: LibraryItemKind.PRESENTATION,
		name: 'Roadmap review.pptx',
		source: LibraryItemSource.UPLOADED,
		updatedAt: now - 9 * DAY
	},
	{
		aspectRatio: 1,
		favorite: true,
		id: 'm9',
		kind: LibraryItemKind.FOLDER,
		name: 'Design references',
		source: LibraryItemSource.UPLOADED,
		updatedAt: now - 12 * DAY
	},
	{
		aspectRatio: 1,
		favorite: false,
		id: 'm10',
		kind: LibraryItemKind.IMAGE,
		name: 'White llama sketch on black.png',
		source: LibraryItemSource.GENERATED,
		updatedAt: now - 15 * DAY
	},
	{
		aspectRatio: 4 / 3,
		favorite: false,
		id: 'm11',
		kind: LibraryItemKind.IMAGE,
		name: 'Screenshot 2026-08-09 at 19.47.36.png',
		source: LibraryItemSource.UPLOADED,
		updatedAt: now - 40 * DAY
	},
	{
		aspectRatio: 3 / 4,
		favorite: false,
		id: 'm12',
		kind: LibraryItemKind.DOCUMENT,
		name: 'Server flags cheat sheet.txt',
		source: LibraryItemSource.GENERATED,
		updatedAt: now - 60 * DAY
	},
	{
		aspectRatio: 4 / 3,
		favorite: false,
		id: 'm13',
		kind: LibraryItemKind.IMAGE,
		name: 'Home office with coding setup.png',
		source: LibraryItemSource.GENERATED,
		updatedAt: now - 75 * DAY
	},
	{
		aspectRatio: 3 / 4,
		favorite: false,
		id: 'm14',
		kind: LibraryItemKind.PDF,
		name: 'Attention is all you need.pdf',
		source: LibraryItemSource.UPLOADED,
		updatedAt: now - 90 * DAY
	}
];
