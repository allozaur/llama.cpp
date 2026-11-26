<script lang="ts">
	import type { Component } from 'svelte';

	/** Where a prompt or a skill comes from, and the mark of its source. */
	interface Props {
		class?: string;
		entry: { iconUrl?: string; origin: string };
		source: { icon: Component<{ class?: string }> };
	}

	let { class: className = '', entry, source }: Props = $props();
</script>

<!-- where a prompt or a skill comes from: the library, a folder, or the MCP server that offers it -->
<span class="flex min-w-0 items-center gap-1.5 text-caption text-muted-foreground {className}">
	{#if entry.iconUrl}
		<img
			alt=""
			class="size-3 shrink-0 rounded-sm"
			onerror={(e) => {
				(e.currentTarget as HTMLImageElement).style.display = 'none';
			}}
			src={entry.iconUrl}
		/>
	{:else}
		<source.icon class="size-3 shrink-0" />
	{/if}

	<span class="truncate">{entry.origin}</span>
</span>
