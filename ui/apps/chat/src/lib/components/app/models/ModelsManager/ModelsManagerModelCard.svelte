<script lang="ts">
	import ModelAvatar from '../ModelAvatar.svelte';
	import ModelCapabilities from '../ModelCapabilities.svelte';
	import ModelCard from '../ModelCard.svelte';
	import ModelContext from '../ModelContext.svelte';
	import ModelDownloadProgressBar from '../ModelDownloadProgressBar.svelte';
	import ModelDraftSubline from '../ModelDraftSubline.svelte';
	import ModelId from '../ModelId.svelte';
	import ModelsManagerStatusCell from './ModelsManagerStatusCell.svelte';
	import { modelRowActions } from './row-actions';
	import { configuredContext, downloadProgressFor } from './utils';
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
</script>

<ModelCard
	dimmed={isHidden}
	onSelect={() => onSelect(option)}
	pressed={download ? undefined : selected}
	{selected}
	tooltip={option.model}
>
	{#snippet avatar()}
		<!-- the details header's geometry: base org, quant org badge -->
		<ModelAvatar {option} showBaseModelAvatar size="size-9" />
	{/snippet}

	{#snippet title()}
		<span class="flex min-w-0 items-start gap-1.5">
			<ModelId
				aliases={option.aliases}
				class="min-w-0 flex-1"
				draftSidecars={option.draftSidecars}
				hideCapabilities
				hideModalities
				hideOrgName
				modalities={option.modalities}
				modelId={option.model}
				stackId
				tags={option.tags}
			/>

			{#if favorite}
				<!-- the heart is decorative, the text beside it carries the state -->
				<Heart aria-hidden="true" class="mt-1 h-3.5 w-3.5 shrink-0 text-rose-500" />

				<span class="sr-only">favorited</span>
			{/if}
		</span>
	{/snippet}

	{#snippet actions()}
		<DropdownMenuActions
			actions={modelRowActions(option, { download, favorite, isHidden }, { onDelete })}
			align="end"
			triggerIcon={MoreHorizontal}
			triggerTooltip="Model actions"
		/>
	{/snippet}

	<ModelCapabilities asBadges {option} />

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

	{#snippet footer()}
		<ModelContext class="text-xs" configured={configuredContext(option)} {option} />
	{/snippet}

	{#snippet footerEnd()}
		<ModelsManagerStatusCell {download} {option} />
	{/snippet}

	{#snippet overlay()}
		{#if download}
			<ModelDownloadProgressBar
				downloadedBytes={downloadProgress?.downloadedBytes ?? 0}
				overlay
				totalBytes={downloadProgress?.totalBytes ?? 0}
			/>
		{/if}
	{/snippet}
</ModelCard>
