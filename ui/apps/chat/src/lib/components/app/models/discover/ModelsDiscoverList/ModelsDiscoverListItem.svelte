<script lang="ts">
	import ModelId from '../../ModelId.svelte';
	import ModelOrgAvatar from '../../ModelOrgAvatar.svelte';
	import { useHubModelSummary } from '$lib/hooks/use-hub-model-summary.svelte';
	import type { HfModelInfo } from '$lib/types/huggingface';

	interface Props {
		model: HfModelInfo;
		active?: boolean;
		/** Show the original (base) model's org avatar instead of the repo's org. */
		showBaseModelAvatar?: boolean;
		onSelect?: (modelId: string) => void;
	}

	let { active = false, model, onSelect, showBaseModelAvatar = false }: Props = $props();

	const summary = useHubModelSummary(
		() => model,
		() => showBaseModelAvatar
	);
</script>

<li
	class="group relative overflow-hidden rounded-lg transition-colors {active
		? 'bg-primary/10 hover:bg-primary/15'
		: 'hover:bg-muted/60'}"
>
	<button
		aria-current={active ? 'page' : undefined}
		class="flex w-full min-w-0 cursor-pointer items-start gap-2.5 p-2.5 text-left"
		onclick={() => onSelect?.(model.id)}
		type="button"
	>
		<ModelOrgAvatar
			class="mt-1"
			org={summary.avatarOrg}
			quantOrg={showBaseModelAvatar ? summary.org : undefined}
		/>

		<span class="min-w-0 flex-1">
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
	</button>
</li>
