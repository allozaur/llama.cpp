<script lang="ts">
	import type { LlamaServerMcpServer } from '../llama-server';
	import McpServerCardToolsList from './McpServerCard/McpServerCardToolsList.svelte';
	import { Badge } from '@ggml-org/llama-ui/ui/badge';
	import * as Card from '@ggml-org/llama-ui/ui/card';
	import { Switch } from '@ggml-org/llama-ui/ui/switch';
	import { SquareTerminal } from '@lucide/svelte';
	import { ToolSource } from '#lib/enums/index.ts';
	// direct import of the store, not via the barrel, to avoid circular deps
	import { toolsStore } from '#lib/stores/tools.svelte.ts';

	interface Props {
		server: LlamaServerMcpServer;
	}

	let { server }: Props = $props();

	// the same group key the tools settings switch the server's tools off with
	let groupKey = $derived(toolsStore.getGroupKey(ToolSource.MCP, server.groupId));
	let enabled = $derived(toolsStore.isToolEnabled(groupKey));
	let tools = $derived(
		server.tools.map(({ definition }) => ({
			description: definition.function.description,
			name: definition.function.name
		}))
	);
</script>

<!-- an MCP server llama-server runs from its config file: read-only here, its tools can be
     switched off like those of any other server -->
<Card.Root class="!gap-3 bg-muted/30 p-4">
	<div class="flex items-start justify-between gap-3">
		<div class="flex min-w-0 flex-col gap-3">
			<span class="flex min-w-0 items-center gap-1.5">
				<SquareTerminal class="size-icon-lg shrink-0 text-muted-foreground" />

				<span class="truncate leading-6 font-medium">{server.name}</span>
			</span>

			<div class="flex flex-wrap items-center gap-1.5">
				<Badge class="h-5 gap-1 px-1.5 text-[10px]" variant="outline">
					<SquareTerminal class="size-icon-xs" />

					stdio
				</Badge>

				<Badge class="h-5 px-1.5 text-[10px]" variant="secondary">Run by llama-server</Badge>
			</div>
		</div>

		<Switch
			aria-label="Use the tools of {server.name}"
			checked={enabled}
			onCheckedChange={(checked) => toolsStore.setToolEnabled(groupKey, checked)}
		/>
	</div>

	<p class="text-xs text-muted-foreground">
		llama-server starts this server from its config file. To change or remove it, edit the file and
		restart llama-server.
	</p>

	{#if tools.length > 0}
		<McpServerCardToolsList {tools} />
	{/if}
</Card.Root>
