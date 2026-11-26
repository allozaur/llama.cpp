<script lang="ts">
	import type { PromptEntry, PromptSource } from '#lib/extensions/index.ts';

	interface Props {
		class?: string;
		entry: PromptEntry;
		source: PromptSource;
	}

	let { class: className = '', entry, source }: Props = $props();
</script>

<!-- where a prompt comes from: the library, or the MCP server that offers it -->
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
