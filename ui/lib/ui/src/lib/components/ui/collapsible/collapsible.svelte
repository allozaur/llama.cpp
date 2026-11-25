<!--
	@component
	Content that a Collapsible.Trigger shows and hides in place, for detail most readers can skip. `open` can be
	bound. In the app, CollapsibleSection adds the chevron and the styling.

	@summary Content that a trigger shows and hides in place.
-->
<script lang="ts">
	import { Collapsible as CollapsiblePrimitive } from 'bits-ui';

	let {
		open = $bindable(false),
		ref = $bindable(null),
		...restProps
	}: CollapsiblePrimitive.RootProps = $props();
</script>

<CollapsiblePrimitive.Root bind:open bind:ref data-slot="collapsible" {...restProps} />
