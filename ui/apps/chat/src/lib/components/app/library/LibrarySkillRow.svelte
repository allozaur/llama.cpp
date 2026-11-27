<script lang="ts">
	import { Badge } from '@ggml-org/llama-ui/ui/badge';
	import type { SkillEntry, SkillSource } from '#lib/extensions/index.ts';

	interface Props {
		entry: SkillEntry;
		source: SkillSource;
		onOpen: () => void;
	}

	let { entry, onOpen, source }: Props = $props();
</script>

<!-- one skill: its source's mark on a tile, its name with where it comes from, and what it is for -->
<button
	class="flex w-full cursor-pointer items-center gap-3 rounded-lg px-2 py-2.5 text-left transition-colors hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
	onclick={onOpen}
	type="button"
>
	<span
		class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground"
	>
		<source.icon class="size-5" />
	</span>

	<span class="flex min-w-0 flex-1 flex-col gap-0.5">
		<span class="flex min-w-0 items-center gap-2">
			<span class="truncate text-label">{entry.name}</span>

			<Badge class="shrink-0" variant="secondary">{entry.origin}</Badge>
		</span>

		{#if entry.description}
			<span class="truncate text-body-sm text-muted-foreground">{entry.description}</span>
		{/if}
	</span>
</button>
