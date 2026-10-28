<script lang="ts">
	import ModelAvatar from '../ModelAvatar.svelte';
	import ModelCapabilities from '../ModelCapabilities.svelte';
	import ModelContext from '../ModelContext.svelte';
	import ModelDownloadProgressBar from '../ModelDownloadProgressBar.svelte';
	import ModelDraftSubline from '../ModelDraftSubline.svelte';
	import ModelId from '../ModelId.svelte';
	import ModelsManagerStatusCell from './ModelsManagerStatusCell.svelte';
	import { modelRowActions } from './row-actions';
	import { configuredContext, downloadProgressFor, isRowControlClick } from './utils';
	import { Heart, MoreHorizontal } from '@lucide/svelte';
	import { DropdownMenuActions } from '$lib/components/app';
	import { ModelRowDownloadState } from '$lib/enums';
	import { modelsStore } from '$lib/stores';
	import type { ModelOption, ModelSidecarBadge } from '$lib/types/models';

	interface Props {
		isFavorite: (option: ModelOption) => boolean;
		option: ModelOption;
		onDelete: (option: ModelOption) => void;
		onSelect: (option: ModelOption) => void;
		selected: boolean;
		/** Draft sidecars already on disk, when the card stands for a download. */
		sidecarBadges?: ModelSidecarBadge[];
	}

	let { isFavorite, onDelete, onSelect, option, selected, sidecarBadges }: Props = $props();

	let favorite = $derived(isFavorite(option));
	let isHidden = $derived(modelsStore.isHidden(option.id));
	// live while the download runs, frozen while it is paused
	let downloadProgress = $derived(downloadProgressFor(option.model));
	// a tracked download takes over the status control while it runs
	let download = $derived(
		modelsStore.status.isDownloadPaused(option.model)
			? ModelRowDownloadState.PAUSED
			: modelsStore.status.isDownloadInProgress(option.model)
				? ModelRowDownloadState.DOWNLOADING
				: null
	);

	function activate(): void {
		onSelect(option);
	}
</script>

<!-- the whole card opens the model for a pointer; keyboard users reach the same action
     through the model's own button, the way a table row works -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class={[
		'group relative flex min-w-0 cursor-pointer flex-col gap-3 overflow-hidden rounded-xl border p-3 transition',
		isHidden && 'opacity-60',
		selected
			? 'border-primary/40 bg-accent text-accent-foreground'
			: 'border-border/50 bg-card hover:bg-muted/40'
	]}
	onclick={(event) => {
		if (!isRowControlClick(event)) activate();
	}}
>
	<div class="flex min-w-0 items-start gap-2">
		<!-- only the model itself is the button: the card also holds a load control and
		     an actions menu, and a button nested in a button is invalid -->
		<button
			aria-pressed={download ? undefined : selected}
			class="flex min-w-0 flex-1 cursor-pointer items-start gap-3 text-left"
			onclick={activate}
			type="button"
		>
			<ModelAvatar {option} size="size-9" />

			<ModelId
				aliases={option.aliases}
				class="min-w-0 flex-1 text-sm"
				draftSidecars={option.draftSidecars}
				hideCapabilities
				hideModalities
				modalities={option.modalities}
				modelId={option.model}
				stackId
				tags={option.tags}
				title={option.model}
				wrap
			/>
		</button>

		<DropdownMenuActions
			actions={modelRowActions(option, { download, favorite, isHidden }, { onDelete })}
			align="end"
			triggerIcon={MoreHorizontal}
			triggerTooltip="Model actions"
		/>
	</div>

	{#if sidecarBadges?.length}
		<div class="flex w-fit flex-col">
			{#each sidecarBadges as badge (badge.repo + ':' + badge.kind + ':' + (badge.quant ?? ''))}
				<ModelDraftSubline
					connectorClass="ml-4"
					kind={badge.kind}
					quant={badge.quant}
					state={ModelRowDownloadState.DOWNLOADED}
				/>
			{/each}
		</div>
	{/if}

	<div class="flex min-h-5 items-center gap-1.5">
		<ModelCapabilities {option} />

		{#if favorite}
			<!-- the heart is decorative, the button's pressed state carries the selection -->
			<Heart aria-hidden="true" class="h-3.5 w-3.5 shrink-0 text-rose-500" />

			<span class="sr-only">favorited</span>
		{/if}
	</div>

	<div class="mt-auto flex items-center justify-between gap-2 border-t border-border/40 pt-3">
		<ModelContext configured={configuredContext(option)} {option} />

		<ModelsManagerStatusCell {download} {option} />
	</div>

	{#if download}
		<ModelDownloadProgressBar
			downloadedBytes={downloadProgress?.downloadedBytes ?? 0}
			overlay
			totalBytes={downloadProgress?.totalBytes ?? 0}
		/>
	{/if}
</div>
