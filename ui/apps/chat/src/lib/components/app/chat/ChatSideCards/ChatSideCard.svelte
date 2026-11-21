<script lang="ts">
	// One floating card of the chat screen's side column: a header that folds
	// the card away, and its body. No panel around it, the card floats alone.

	import { cn } from '@ggml-org/llama-ui/utils';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import type { Component, Snippet } from 'svelte';
	import { slide } from 'svelte/transition';

	interface Props {
		/** Header controls, after the title. */
		actions?: Snippet;
		children: Snippet;
		class?: string;
		/** Shown as a small count next to the title. */
		count?: number;
		icon?: Component;
		open?: boolean;
		title: string;
	}

	let {
		actions,
		children,
		class: className,
		count,
		icon: Icon,
		open = $bindable(true),
		title
	}: Props = $props();
</script>

<section
	aria-label={title}
	class={cn('card-surface flex flex-col overflow-hidden rounded-xl', className)}
>
	<header class="flex items-center gap-1 py-1.5 pr-1.5 pl-3">
		<button
			aria-expanded={open}
			class="flex min-w-0 flex-1 cursor-pointer items-center gap-2 py-1 text-left"
			onclick={() => (open = !open)}
			type="button"
		>
			{#if Icon}
				<Icon class="size-icon-sm shrink-0 text-muted-foreground" />
			{/if}

			<span class="truncate text-body-sm font-medium">{title}</span>

			{#if count !== undefined}
				<span
					class="rounded-full bg-muted px-1.5 text-caption-sm text-muted-foreground tabular-nums"
				>
					{count}
				</span>
			{/if}

			<ChevronDown
				class={cn(
					'ml-auto size-icon-sm shrink-0 text-muted-foreground transition-transform',
					!open && '-rotate-90'
				)}
			/>
		</button>

		{@render actions?.()}
	</header>

	{#if open}
		<div transition:slide={{ duration: 150 }}>
			{@render children()}
		</div>
	{/if}
</section>
