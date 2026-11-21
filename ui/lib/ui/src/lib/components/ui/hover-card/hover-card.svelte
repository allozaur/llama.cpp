<!--
	@component
	A small panel that opens when the pointer rests on its HoverCard.Trigger, for a preview of what a link or a name
	stands for. Touch and keyboard users cannot open it, so it must not hold anything they need; for that use
	Popover.

	@summary A preview panel that opens on hover.
-->
<script lang="ts">
	import { LinkPreview as HoverCardPrimitive } from 'bits-ui';

	let { open = $bindable(false), ...restProps }: HoverCardPrimitive.RootProps = $props();
</script>

<HoverCardPrimitive.Root bind:open {...restProps} />
