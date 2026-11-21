<script lang="ts">
	// A folding group of a breakdown: a title with the number of items, then
	// each item with its count, such as the MCP tools by server.

	import type { ContextBreakdownGroupItem } from './types';
	import * as Collapsible from '@ggml-org/llama-ui/ui/collapsible';
	import { cn } from '@ggml-org/llama-ui/utils';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';

	interface Props {
		class?: string;
		/** A swatch before the title, the colour of the group's row. */
		colorClass?: string;
		items: ContextBreakdownGroupItem[];
		open?: boolean;
		title: string;
	}

	let { class: className, colorClass, items, open = $bindable(false), title }: Props = $props();
</script>

<Collapsible.Root bind:open class={cn('text-caption max-md:text-body-sm', className)}>
	<Collapsible.Trigger
		class="flex w-full cursor-pointer items-center gap-1.5 rounded-md py-1 text-left text-muted-foreground hover:text-foreground"
	>
		<ChevronRight class={['size-icon-sm shrink-0 transition-transform', open && 'rotate-90']} />

		{#if colorClass}
			<span aria-hidden="true" class={['size-2.5 shrink-0 rounded-xs', colorClass]}></span>
		{/if}

		<span class="truncate">{title}</span>

		<span class="font-mono text-muted-foreground/70 tabular-nums">{items.length}</span>
	</Collapsible.Trigger>

	<!-- the content animates its own height and unmounts the list once closed -->
	<Collapsible.Content>
		<ul class="flex max-h-72 flex-col gap-1 overflow-y-auto py-1 pl-5.5">
			{#each items as item (item.key)}
				<li class="flex items-baseline gap-2">
					<span class="min-w-0 flex-1 truncate">
						{#if item.detail}
							<span class="text-muted-foreground">{item.detail} ·</span>
						{/if}

						{item.label}
					</span>

					<span class="shrink-0 font-mono text-muted-foreground tabular-nums">{item.value}</span>
				</li>
			{/each}
		</ul>
	</Collapsible.Content>
</Collapsible.Root>
