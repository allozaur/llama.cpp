<script lang="ts">
	import type { ToolGroupIdentityProps } from '../points/tools';
	import { McpServerIdentity } from '#lib/components/app/mcp/index.ts';
	import { ICON_CLASS_DEFAULT } from '#lib/constants/index.ts';
	import { mcpStore } from '#lib/stores/mcp/index.svelte.ts';

	let { groupId, label }: ToolGroupIdentityProps = $props();
</script>

<McpServerIdentity
	displayName={label}
	faviconUrl={mcpStore.getServerFavicon(groupId)}
	iconClass={ICON_CLASS_DEFAULT}
	iconRounded="rounded-sm"
	showVersion={false}
/>
