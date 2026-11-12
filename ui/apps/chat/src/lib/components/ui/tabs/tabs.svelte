<script lang="ts">
	import { cn } from '$lib/components/ui/utils.js';
	import { Tabs as TabsPrimitive } from 'bits-ui';

	let {
		class: className,
		ref = $bindable(null),
		value = $bindable(''),
		...restProps
	}: TabsPrimitive.RootProps = $props();
</script>

<TabsPrimitive.Root
	bind:ref
	bind:value
	class={cn('flex flex-col gap-2', className)}
	data-slot="tabs"
	{...restProps}
/>
