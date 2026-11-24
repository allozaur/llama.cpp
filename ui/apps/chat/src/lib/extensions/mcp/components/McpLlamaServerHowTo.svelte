<script lang="ts">
	import { LLAMA_SERVER_MCP_CONFIG_EXAMPLE, LLAMA_SERVER_MCP_CONFIG_OPTION } from '../llama-server';
	import * as Collapsible from '@ggml-org/llama-ui/ui/collapsible';
	import { ChevronDown, ChevronRight, SquareTerminal } from '@lucide/svelte';
	import { ActionIconCopyToClipboard } from '#lib/components/app/index.ts';

	interface Props {
		class?: string;
		open?: boolean;
	}

	let { class: className, open = $bindable(false) }: Props = $props();

	const command = `llama-server ${LLAMA_SERVER_MCP_CONFIG_OPTION} mcp.json`;
</script>

<!-- how to use an MCP server that runs as a local command: a page cannot start one, so
     llama-server does, from its config file -->
<Collapsible.Root bind:open class={['rounded-xl border p-4', className]}>
	<Collapsible.Trigger class="flex w-full items-center gap-2 text-left text-sm font-medium">
		<SquareTerminal class="size-icon-default shrink-0 text-muted-foreground" />

		<span class="flex-1">Use a local MCP server (stdio)</span>

		{#if open}
			<ChevronDown class="size-icon-sm text-muted-foreground" />
		{:else}
			<ChevronRight class="size-icon-sm text-muted-foreground" />
		{/if}
	</Collapsible.Trigger>

	<Collapsible.Content class="mt-3 flex flex-col gap-3 text-sm text-muted-foreground">
		<p>
			A server that runs as a command on your computer, like iMCP or a filesystem server, is started
			by llama-server, not by this page. List it in a config file:
		</p>

		<div class="relative rounded-lg bg-muted/50">
			<pre
				class="overflow-x-auto p-3 pr-10 font-mono text-xs text-foreground">{LLAMA_SERVER_MCP_CONFIG_EXAMPLE}</pre>

			<div class="absolute top-1.5 right-1.5">
				<ActionIconCopyToClipboard
					ariaLabel="Copy the config example"
					text={LLAMA_SERVER_MCP_CONFIG_EXAMPLE}
				/>
			</div>
		</div>

		<p>Then start llama-server with it:</p>

		<div class="relative rounded-lg bg-muted/50">
			<pre class="overflow-x-auto p-3 pr-10 font-mono text-xs text-foreground">{command}</pre>

			<div class="absolute top-1.5 right-1.5">
				<ActionIconCopyToClipboard ariaLabel="Copy the command" text={command} />
			</div>
		</div>

		<p>
			Its tools then show up here and in the tools menu, and llama-server runs them when a model
			calls them.
		</p>
	</Collapsible.Content>
</Collapsible.Root>
