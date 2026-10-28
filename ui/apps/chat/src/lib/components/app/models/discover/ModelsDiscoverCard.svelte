<script lang="ts">
	import ModelId from '../ModelId.svelte';
	import ModelOrgAvatar from '../ModelOrgAvatar.svelte';
	import { useHubModelSummary } from '$lib/hooks/use-hub-model-summary.svelte';
	import { modelsDiscoverStore } from '$lib/stores';
	import type { HfModelInfo } from '$lib/types/huggingface';

	interface Props {
		model: HfModelInfo;
		active?: boolean;
		class?: string;
		onSelect?: (modelId: string) => void;
	}

	let { active = false, class: className = '', model, onSelect }: Props = $props();

	// the card names the model the repo quantizes, the way the list does
	const summary = useHubModelSummary(
		() => model,
		() => true
	);

	let description = $derived(modelsDiscoverStore.descriptionFor(model.id));
</script>

<button
	aria-current={active ? 'true' : undefined}
	class={[
		'flex min-w-0 cursor-pointer flex-col gap-2.5 rounded-xl border p-3 text-left transition-colors',
		active
			? 'border-primary/40 bg-primary/10 hover:bg-primary/15'
			: 'border-border/50 bg-card hover:bg-muted/50',
		className
	]}
	onclick={() => onSelect?.(model.id)}
	type="button"
>
	<span class="flex min-w-0 items-start gap-2.5">
		<ModelOrgAvatar class="mt-1" org={summary.avatarOrg} quantOrg={summary.org} />

		<ModelId
			class="min-w-0"
			contextLength={summary.contextLength}
			draftKinds={summary.draftKinds}
			hideOrgName
			iconsOnNewLine
			modalities={summary.modalities}
			modelId={model.id}
			sizeRange={summary.sizeRange}
			supportsThinking={summary.supportsThinking}
			supportsToolUse={summary.supportsToolUse}
			wrap
		/>
	</span>

	{#if description}
		<span class="line-clamp-2 text-xs text-muted-foreground">{description}</span>
	{/if}
</button>
