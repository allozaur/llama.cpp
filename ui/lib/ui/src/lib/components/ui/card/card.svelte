<!--
	@component
	A framed surface that groups related content, with optional Card.Header, Card.Title, Card.Description,
	Card.Action, Card.Content and Card.Footer parts. Use it for an item in a list or grid, or a self-contained block
	on a page.

	@summary A framed surface for a group of related content.
-->
<script lang="ts">
	import { cn, type WithElementRef } from '../utils';
	import type { HTMLAttributes } from 'svelte/elements';

	let {
		children,
		class: className,
		ref = $bindable(null),
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> = $props();
</script>

<div
	bind:this={ref}
	class={cn('card-surface flex flex-col gap-6 rounded-xl py-6', className)}
	data-slot="card"
	{...restProps}
>
	{@render children?.()}
</div>
