import { LibraryItemKind } from '$lib/enums';
import type { LibraryItem } from '$lib/types';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const now = Date.now();

/**
 * Placeholder items for the Media tab, until the library has a source of
 * its own. Shapes and timestamps vary so both layouts can be judged.
 */
export const LIBRARY_MOCK_ITEMS: LibraryItem[] = [
	{
		aspectRatio: 4 / 3,
		id: 'm1',
		kind: LibraryItemKind.IMAGE,
		name: 'Cozy developer workspace by sunny windows.png',
		updatedAt: now - 2 * HOUR
	},
	{
		aspectRatio: 16 / 9,
		id: 'm2',
		kind: LibraryItemKind.VIDEO,
		name: 'Model loading walkthrough.mp4',
		updatedAt: now - 5 * HOUR
	},
	{
		aspectRatio: 3 / 4,
		id: 'm3',
		kind: LibraryItemKind.IMAGE,
		name: 'Minimal dual-monitor workspace with plants.png',
		updatedAt: now - DAY
	},
	{
		aspectRatio: 1,
		id: 'm4',
		kind: LibraryItemKind.AUDIO,
		name: 'Voice note about the release.m4a',
		updatedAt: now - 2 * DAY
	},
	{
		aspectRatio: 1,
		id: 'm5',
		kind: LibraryItemKind.IMAGE,
		name: 'Studio monitor, front view.jpeg',
		updatedAt: now - 3 * DAY
	},
	{
		aspectRatio: 2 / 3,
		id: 'm6',
		kind: LibraryItemKind.IMAGE,
		name: 'White llama sketch on black.png',
		updatedAt: now - 6 * DAY
	},
	{
		aspectRatio: 16 / 10,
		id: 'm7',
		kind: LibraryItemKind.IMAGE,
		name: 'Screenshot 2026-08-09 at 19.47.36.png',
		updatedAt: now - 9 * DAY
	},
	{
		aspectRatio: 4 / 3,
		id: 'm8',
		kind: LibraryItemKind.IMAGE,
		name: 'Home office with coding setup.png',
		updatedAt: now - 14 * DAY
	}
];
