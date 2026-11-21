<script lang="ts">
	// A thin bar split into coloured segments, one per part of a whole such as
	// the context window. The track is the part left over.

	import type { ContextUsageBarSegment } from './types';
	import { cn } from '@ggml-org/llama-ui/utils';

	interface Props {
		'aria-label'?: string;
		class?: string;
		segments: ContextUsageBarSegment[];
		/** The whole the segments are parts of. */
		total: number;
	}

	let { 'aria-label': ariaLabel = 'Usage', class: className, segments, total }: Props = $props();

	const used = $derived(segments.reduce((sum, segment) => sum + segment.value, 0));
	const shown = $derived(
		total > 0
			? segments
					.filter((segment) => segment.value > 0)
					.map((segment) => ({ ...segment, width: (segment.value / total) * 100 }))
			: []
	);
</script>

<div
	aria-label={ariaLabel}
	aria-valuemax={total}
	aria-valuemin={0}
	aria-valuenow={Math.min(used, total)}
	class={cn('flex h-1.5 w-full gap-px overflow-hidden rounded-full bg-muted', className)}
	role="meter"
>
	{#each shown as segment (segment.key)}
		<!-- a sliver still shows: a part as small as a pixel keeps one -->
		<div
			style:width="{segment.width}%"
			class={[
				'h-full min-w-px transition-[width] duration-300 first:rounded-l-full',
				segment.colorClass
			]}
			title={segment.label}
		></div>
	{/each}
</div>
