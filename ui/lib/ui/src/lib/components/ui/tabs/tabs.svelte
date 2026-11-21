<!--
	@component
	Views that share one place, one visible at a time: a Tabs.List of Tabs.Trigger keys and a Tabs.Content for each.
	Use it for sibling views of the same thing, not for steps or for navigation between pages.

	@summary Sibling views in one place, one visible at a time.
-->
<script lang="ts">
	import { cn } from '../utils.js';
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
	class={cn('group/tabs flex gap-2 data-[orientation=horizontal]:flex-col', className)}
	data-slot="tabs"
	{...restProps}
/>
