<script lang="ts">
	import { cn } from '$lib/components/ui/utils.js';
	import { Tabs as TabsPrimitive } from 'bits-ui';

	let { class: className, ref = $bindable(null), ...restProps }: TabsPrimitive.ListProps = $props();
</script>

<TabsPrimitive.List
	bind:ref
	class={cn(
		'inline-flex h-9 w-fit items-center justify-center rounded-lg bg-muted p-[3px] text-muted-foreground',
		className
	)}
	data-slot="tabs-list"
	{...restProps}
/>
