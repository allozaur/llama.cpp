<!--
	@component
	The text label of a form control. Give it `for` with the control's id so a click focuses the control and screen
	readers name it.

	@summary The label of a form control.
-->
<script lang="ts">
	import { cn } from '../utils.js';
	import { Label as LabelPrimitive } from 'bits-ui';

	let {
		class: className,
		ref = $bindable(null),
		...restProps
	}: LabelPrimitive.RootProps = $props();
</script>

<LabelPrimitive.Root
	bind:ref
	class={cn(
		'flex items-center gap-2 text-body-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
		className
	)}
	data-slot="label"
	{...restProps}
/>
