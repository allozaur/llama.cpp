<script lang="ts">
	import SidebarNavigationActions from './SidebarNavigationActions.svelte';
	import type { SidebarAction } from '$lib/enums';
	import { extensions, type NavigationItem } from '$lib/extensions';
	import { sidebarFooterItems } from '$lib/utils';

	interface Props {
		onAction?: (action: SidebarAction) => void;
		/** Opens an item an extension contributed. */
		onContributed?: (item: NavigationItem) => void;
	}

	let { onAction, onContributed }: Props = $props();

	const items = $derived(sidebarFooterItems(extensions.contributions('navigation')));
</script>

<!-- the footer: managing the app around the chats, a group inset in the sidebar, its rows
     rounded concentric with it (see the nested surfaces in app.css) -->
<SidebarNavigationActions
	class="inset-group-surface mx-2 mb-2 p-(--surface-group-padding)"
	{items}
	{onAction}
	{onContributed}
/>
