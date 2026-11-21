<!--
	@component
	A panel that slides in from an edge of the screen and can be dragged away, the phone-sized counterpart of a
	dialog or a menu. Built from Drawer.Trigger, Drawer.Content, Drawer.Header, Drawer.Title, Drawer.Description and
	Drawer.Footer; Drawer.NestedRoot opens one over another.

	@summary A panel that slides in from a screen edge, mainly on phones.
-->
<script lang="ts">
	import { Drawer as DrawerPrimitive } from 'vaul-svelte';

	let {
		activeSnapPoint = $bindable(null),
		open = $bindable(false),
		shouldScaleBackground = true,
		...restProps
	}: DrawerPrimitive.RootProps = $props();
</script>

<DrawerPrimitive.Root bind:activeSnapPoint bind:open {shouldScaleBackground} {...restProps} />
