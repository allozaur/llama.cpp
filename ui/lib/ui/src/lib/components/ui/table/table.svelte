<!--
	@component
	A table for rows of data with the same columns, built from Table.Header, Table.Body, Table.Row, Table.Head and
	Table.Cell, with an optional Table.Caption and Table.Footer. It scrolls sideways when it is wider than its
	container.

	@summary A table for rows of data with shared columns.
-->
<script lang="ts">
	import { cn, type WithElementRef } from '../utils.js';
	import type { HTMLTableAttributes } from 'svelte/elements';

	let {
		children,
		class: className,
		ref = $bindable(null),
		...restProps
	}: WithElementRef<HTMLTableAttributes> = $props();
</script>

<div class="relative w-full overflow-x-auto" data-slot="table-container">
	<table
		bind:this={ref}
		class={cn('w-full caption-bottom text-body-sm', className)}
		data-slot="table"
		{...restProps}
	>
		{@render children?.()}
	</table>
</div>
