<script lang="ts">
	import ModelCapabilityIcons from '../ModelCapabilityIcons.svelte';
	import ModelCard from '../ModelCard.svelte';
	import ModelOrgAvatar from '../ModelOrgAvatar.svelte';
	import { Database, Download, ScrollText } from '@lucide/svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { useHubModelSummary } from '$lib/hooks/use-hub-model-summary.svelte';
	import { HuggingFaceService } from '$lib/services';
	import { ModelsService } from '$lib/services/models.service';
	import { modelsDiscoverStore, modelsStore } from '$lib/stores';
	import type { HfModelInfo } from '$lib/types/huggingface';
	import { formatParameters, repoOf } from '$lib/utils';

	interface Props {
		model: HfModelInfo;
		active?: boolean;
		class?: string;
		onSelect?: (modelId: string) => void;
	}

	let { active = false, class: className = '', model, onSelect }: Props = $props();

	// the card names the model the repo quantizes, the way the details pane does
	const summary = useHubModelSummary(
		() => model,
		() => true
	);

	let parsed = $derived(ModelsService.parseModelId(model.id));
	let description = $derived(modelsDiscoverStore.descriptionFor(model.id));
	let released = $derived(modelsDiscoverStore.releasedFor(model.id));

	// one quiet line under the name: the size and the drafts the repo ships. A repo
	// outside the curated catalog also names who quantized it, when not the model's own org
	let subline = $derived(
		[
			parsed.params &&
				`${parsed.params}${parsed.activatedParams ? `-${parsed.activatedParams}` : ''}`,
			...summary.draftKinds.map((kind) => kind.toUpperCase()),
			!released && summary.org !== summary.avatarOrg && summary.org
		]
			.filter(Boolean)
			.join(' · ') || summary.org
	);

	// quants of this repo the server already has
	let localModels = $derived(
		modelsStore.models.filter((option) => repoOf(option.model) === model.id)
	);
	let isLoaded = $derived(localModels.some((option) => modelsStore.isModelLoaded(option.model)));
</script>

<ModelCard
	class={className}
	onSelect={() => onSelect?.(model.id)}
	pressed={active}
	selected={active}
	tooltip={model.id}
>
	{#snippet avatar()}
		<!-- the details header's geometry: base org, quant org badge -->
		<ModelOrgAvatar org={summary.avatarOrg} quantOrg={summary.org} />
	{/snippet}

	{#snippet title()}
		<span class="flex min-w-0 flex-col gap-0.5">
			<span class="truncate font-medium">{parsed.modelName ?? model.id}</span>

			<span class="truncate font-mono text-xs text-muted-foreground tabular-nums">{subline}</span>
		</span>
	{/snippet}

	<!-- above the card's button, so each icon's tooltip is a trigger of its own -->
	{#snippet actions()}
		<span class="flex h-9 items-center pr-1.5">
			<ModelCapabilityIcons
				modalities={summary.modalities}
				supportsThinking={summary.supportsThinking}
				supportsToolUse={summary.supportsToolUse}
			/>
		</span>
	{/snippet}

	{#if description}
		<p class="line-clamp-2 text-[13px] leading-snug text-pretty text-muted-foreground">
			{description}
		</p>
	{/if}

	{#snippet footer()}
		<span class="flex items-center gap-3 whitespace-nowrap tabular-nums">
			{#if summary.sizeRange}
				<span class="inline-flex items-center gap-1" title="Download size">
					<Database class="size-3" />

					{HuggingFaceService.formatSizeRange(summary.sizeRange.min, summary.sizeRange.max)}
				</span>
			{/if}

			{#if summary.contextLength}
				<span class="inline-flex items-center gap-1" title="Context length">
					<ScrollText class="size-3" />

					{formatParameters(summary.contextLength)}
				</span>
			{/if}
		</span>
	{/snippet}

	<!-- a model the server already has says so; a catalog family dates itself, any other
	     repo shows how often it is pulled -->
	{#snippet footerEnd()}
		{#if localModels.length > 0}
			<Badge
				class="font-normal {isLoaded
					? 'border-transparent bg-green-500/15 text-green-700 dark:text-green-400'
					: ''}"
				variant="secondary"
			>
				{isLoaded ? 'Loaded' : 'Downloaded'}
			</Badge>
		{:else if released}
			<span class="text-muted-foreground tabular-nums" title="Released">{released}</span>
		{:else}
			<span
				class="inline-flex items-center gap-1 text-muted-foreground tabular-nums"
				title="Downloads"
			>
				<Download class="size-3" />

				{HuggingFaceService.formatDownloads(model.downloads)}
			</span>
		{/if}
	{/snippet}
</ModelCard>
