<script lang="ts">
	import type { GenerationStats } from '#lib/types/notes.ts';
	import { promptProgressPercent, tokensPerSecond } from '#lib/utils/generation-stats.ts';

	interface Props {
		isGenerating: boolean;
		stats: GenerationStats | null;
	}

	let { isGenerating, stats }: Props = $props();

	let text = $derived.by(() => {
		if (!stats || stats.predictedTokens === 0) {
			if (!isGenerating) return '';

			const percent = stats ? promptProgressPercent(stats) : undefined;

			return percent === undefined ? 'Processing...' : `Processing ${percent}%`;
		}

		const speed = tokensPerSecond(stats);
		const tokens = `${stats.predictedTokens} ${stats.predictedTokens === 1 ? 'token' : 'tokens'}`;

		return speed === undefined ? tokens : `${tokens}, ${speed.toFixed(1)} t/s`;
	});
</script>

{#if text}
	<span class="text-xs whitespace-nowrap text-muted-foreground tabular-nums" data-testid="stats">
		{text}
	</span>
{/if}
