<!--
	@component
	A floating panel anchored to its Popover.Trigger, opened by a click, for a small form, a picker or details that
	should not leave the page. For a list of actions use DropdownMenu; for a plain hint Tooltip.

	@summary A floating panel opened by a click on its trigger.
-->
<script lang="ts">
	import { Popover as PopoverPrimitive } from 'bits-ui';

	let { open = $bindable(false), ...restProps }: PopoverPrimitive.RootProps = $props();
</script>

<PopoverPrimitive.Root bind:open {...restProps} />
