<script lang="ts">
	import type { ToolGroupIdentityProps } from '../../../points/tools';
	import { mcpStore } from '../../stores/index.svelte';
	import McpServerIdentity from '../McpServerIdentity.svelte';
	import { ICON_CLASS_DEFAULT } from '$lib/constants';

	let { groupId, label }: ToolGroupIdentityProps = $props();
</script>

<McpServerIdentity
	displayName={label}
	faviconUrl={mcpStore.getServerFavicon(groupId)}
	iconClass={ICON_CLASS_DEFAULT}
	iconRounded="rounded-sm"
	showVersion={false}
/>
