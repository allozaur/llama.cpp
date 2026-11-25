<!--
	@component
	What a list, a search or a page shows when it has nothing: an Empty.Media icon, an Empty.Title, an
	Empty.Description and, in Empty.Content, the action that fills it.

	@summary The placeholder for a list or page with nothing in it.
-->
<script lang="ts">
	import { cn, type WithElementRef } from '../utils.js';
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
	class={cn(
		'gap-4 rounded-xl border-dashed p-6 flex w-full min-w-0 flex-1 flex-col items-center justify-center text-center text-balance',
		className
	)}
	data-slot="empty"
	{...restProps}
>
	{@render children?.()}
</div>
