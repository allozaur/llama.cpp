<script lang="ts">
	import type { ToolGroupIdentityProps } from '../../../points/tools';
	import { LLAMA_SERVER_MCP_GROUP_PREFIX } from '../../llama-server';
	import { mcpStore } from '../../stores/index.svelte';
	import McpServerIdentity from '../McpServerIdentity.svelte';
	import { SquareTerminal } from '@lucide/svelte';
	import { ICON_CLASS_DEFAULT } from '#lib/constants/index.ts';

	let { groupId, label }: ToolGroupIdentityProps = $props();
</script>

<!-- a server llama-server runs is a local command: a terminal for its icon -->
{#if groupId.startsWith(LLAMA_SERVER_MCP_GROUP_PREFIX)}
	<span class="flex min-w-0 items-center gap-1.5">
		<SquareTerminal class="{ICON_CLASS_DEFAULT} shrink-0 text-muted-foreground" />

		<span class="truncate">{label}</span>
	</span>
{:else}
	<McpServerIdentity
		displayName={label}
		faviconUrl={mcpStore.getServerFavicon(groupId)}
		iconClass={ICON_CLASS_DEFAULT}
		iconRounded="rounded-sm"
		showVersion={false}
	/>
{/if}
