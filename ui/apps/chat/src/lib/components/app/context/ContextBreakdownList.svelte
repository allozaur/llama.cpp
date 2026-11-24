<script lang="ts">
	// Rows of a breakdown: a colour swatch, a label, a count and a share. A
	// label with a hint is dotted-underlined and shows the hint on hover; a row
	// with no share (a part outside the whole) shows "—".

	import type { ContextBreakdownRow } from './types';
	import * as Tooltip from '@ggml-org/llama-ui/ui/tooltip';
	import { cn } from '@ggml-org/llama-ui/utils';

	interface Props {
		'aria-label'?: string;
		class?: string;
		rows: ContextBreakdownRow[];
	}

	let { 'aria-label': ariaLabel, class: className, rows }: Props = $props();
</script>

<ul
	aria-label={ariaLabel}
	class={cn(
		'grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-x-2 gap-y-1.5 text-caption max-md:text-body-sm',
		className
	)}
>
	{#each rows as row (row.key)}
		<li class="col-span-4 grid grid-cols-subgrid items-center">
			<span aria-hidden="true" class={['size-2.5 shrink-0 rounded-xs', row.colorClass]}></span>

			{#if row.hint}
				<Tooltip.Root>
					<Tooltip.Trigger
						class="min-w-0 cursor-help justify-self-start truncate text-left text-muted-foreground underline decoration-muted-foreground/50 decoration-dotted underline-offset-3"
					>
						{row.label}
					</Tooltip.Trigger>

					<Tooltip.Content class="max-w-64">
						<p>{row.hint}</p>
					</Tooltip.Content>
				</Tooltip.Root>
			{:else}
				<span class="min-w-0 truncate text-muted-foreground">{row.label}</span>
			{/if}

			<span class="text-right font-mono tabular-nums">{row.value}</span>

			<span class="min-w-11 text-right font-mono text-muted-foreground tabular-nums">
				{row.share ?? '—'}
			</span>
		</li>
	{/each}
</ul>
