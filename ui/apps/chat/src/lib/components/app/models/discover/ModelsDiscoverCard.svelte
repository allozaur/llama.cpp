<script lang="ts">
	import ModelCapabilityIcons from '../ModelCapabilityIcons.svelte';
	import ModelCard from '../ModelCard.svelte';
	import ModelId from '../ModelId.svelte';
	import ModelOrgAvatar from '../ModelOrgAvatar.svelte';
	import { Database, Download, ScrollText } from '@lucide/svelte';
	import { useHubModelSummary } from '$lib/hooks/use-hub-model-summary.svelte';
	import { HuggingFaceService } from '$lib/services';
	import { modelsDiscoverStore } from '$lib/stores';
	import type { HfModelInfo } from '$lib/types/huggingface';
	import { formatParameters } from '$lib/utils';

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

	let description = $derived(modelsDiscoverStore.descriptionFor(model.id));
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
		<ModelId
			class="min-w-0"
			draftKinds={summary.draftKinds}
			hideCapabilities
			hideModalities
			hideOrgName
			modelId={model.id}
			stackId
		/>
	{/snippet}

	<ModelCapabilityIcons
		asBadges
		modalities={summary.modalities}
		supportsThinking={summary.supportsThinking}
		supportsToolUse={summary.supportsToolUse}
	/>

	{#if description}
		<p class="line-clamp-2 text-xs text-muted-foreground">{description}</p>
	{/if}

	<!-- what the download gives on the left, the way a local card leads with its context;
	     how often it is pulled on the right. Likes and the last update live in the details -->
	{#snippet footer()}
		<span class="flex items-center gap-3 whitespace-nowrap">
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

	{#snippet footerEnd()}
		<span class="inline-flex items-center gap-1 text-muted-foreground" title="Downloads">
			<Download class="size-3" />

			{HuggingFaceService.formatDownloads(model.downloads)}
		</span>
	{/snippet}
</ModelCard>
