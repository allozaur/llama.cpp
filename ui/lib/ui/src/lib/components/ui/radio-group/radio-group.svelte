<!--
	@component
	One choice out of a few that are all visible, each a RadioGroup.Item with a Label. For more than about five
	options, or where space is tight, use Select.

	@summary One choice out of a few visible options.
-->
<script lang="ts">
	import { cn } from '../utils.js';
	import { RadioGroup as RadioGroupPrimitive } from 'bits-ui';

	let {
		class: className,
		ref = $bindable(null),
		value = $bindable(''),
		...restProps
	}: RadioGroupPrimitive.RootProps = $props();
</script>

<RadioGroupPrimitive.Root
	bind:ref
	bind:value
	class={cn('grid gap-2 w-full', className)}
	data-slot="radio-group"
	{...restProps}
/>
