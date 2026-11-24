<script lang="ts">
	// The Context card: what fills the conversation's context window, part by
	// part, with each part's items folded under the rows.

	import ChatSideCard from './ChatSideCard.svelte';
	import { cn } from '@ggml-org/llama-ui/utils';
	import ChartPie from '@lucide/svelte/icons/chart-pie';
	import ContextBreakdownPanel from '#lib/components/app/context/ContextBreakdownPanel.svelte';
	import type { ContextBreakdown } from '#lib/utils/index.ts';

	interface Props {
		breakdown: ContextBreakdown;
		class?: string;
		/** A text class for the "% used" figure, e.g. the gauge's warning colour. */
		levelClass?: string;
		open?: boolean;
	}

	let { breakdown, class: className, levelClass, open = $bindable(true) }: Props = $props();
</script>

<ChatSideCard bind:open class={cn('w-72', className)} icon={ChartPie} title="Context">
	<ContextBreakdownPanel {breakdown} class="px-3 pt-1 pb-3" groups {levelClass} />
</ChatSideCard>
