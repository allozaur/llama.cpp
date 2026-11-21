<!--
	@component
	A pulsing grey block that stands in for content while it loads. Size and round it with classes to match what is
	coming, so the layout does not jump.

	@summary A placeholder block for content that is loading.
-->
<script lang="ts">
	import { cn, type WithElementRef, type WithoutChildren } from '../utils.js';
	import type { HTMLAttributes } from 'svelte/elements';

	let {
		class: className,
		ref = $bindable(null),
		...restProps
	}: WithoutChildren<WithElementRef<HTMLAttributes<HTMLDivElement>>> = $props();
</script>

<div
	bind:this={ref}
	class={cn('animate-pulse rounded-md bg-accent', className)}
	data-slot="skeleton"
	{...restProps}
></div>
