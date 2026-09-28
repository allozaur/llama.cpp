import { Compass, Eye, EyeOff, Heart, HeartOff, Trash2 } from '@lucide/svelte';
import { MODEL_DOWNLOAD_ICONS } from '$lib/constants';
import { ModelRowDownloadState } from '$lib/enums';
import { modelsStore, uiStore } from '$lib/stores';
import type { MenuAction } from '$lib/types';
import type { ModelOption } from '$lib/types/models';
import { repoOf } from '$lib/utils';

interface RowState {
	/** Backend can load and unload the model. */
	canLoad: boolean;
	/** Download state, when the row stands for a tracked download. */
	download?: ModelRowDownloadState | null;
	favorite: boolean;
	isHidden: boolean;
}

interface RowHandlers {
	onDelete: (option: ModelOption) => void;
}

/** Row actions follow the app's dropdown pattern: icon, label, separators, variants. */
export function modelRowActions(
	option: ModelOption,
	state: RowState,
	handlers: RowHandlers
): MenuAction[] {
	const { canLoad, download, favorite, isHidden } = state;
	// the details pane is keyed by repo, not by `<repo>:<quant>`; the entry exists only
	// while Discover is on
	const viewInDiscover = uiStore.isDiscoverEnabled
		? [
				{
					icon: Compass,
					label: 'See in Discover',
					onclick: () => uiStore.openModelsDiscover(repoOf(option.model)),
					separator: true
				}
			]
		: [];

	// a tracked download is paused, resumed or dropped: it is not loaded, hidden or
	// drafted. An in-flight row cancels, which stops the download and removes the
	// partial files; a paused one deletes, which removes the partials from disk
	if (download) {
		const isPaused = download === ModelRowDownloadState.PAUSED;

		return [
			{
				icon: isPaused ? MODEL_DOWNLOAD_ICONS.resume : MODEL_DOWNLOAD_ICONS.pause,
				label: isPaused ? 'Resume downloading' : 'Pause downloading',
				onclick: () => void modelsStore.status.toggleDownload(option.model)
			},
			{
				icon: Trash2,
				label: isPaused ? 'Delete from disk' : 'Cancel download',
				onclick: () => handlers.onDelete(option),
				separator: true,
				variant: 'destructive' as const
			},
			...viewInDiscover
		];
	}

	return [
		{
			icon: favorite ? HeartOff : Heart,
			label: favorite ? 'Remove from favorites' : 'Add to favorites',
			onclick: () => modelsStore.toggleFavorite(option.model)
		},
		...(canLoad
			? [
					{
						icon: Trash2,
						label: 'Delete from disk',
						onclick: () => handlers.onDelete(option),
						separator: true,
						variant: 'destructive' as const
					}
				]
			: []),
		{
			icon: isHidden ? Eye : EyeOff,
			label: isHidden ? 'Unhide model' : 'Hide model',
			onclick: () => modelsStore.toggleHidden(option.id),
			separator: true
		},
		...viewInDiscover
	];
}
