<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { ServerToolType } from '#lib/enums/index.ts';
	import McpLlamaServerCard from '#lib/extensions/mcp/components/McpLlamaServerCard.svelte';
	import McpLlamaServerHowTo from '#lib/extensions/mcp/components/McpLlamaServerHowTo.svelte';
	import type { LlamaServerMcpServer } from '#lib/extensions/mcp/llama-server.ts';
	import type { ServerToolInfo } from '#lib/types/index.ts';
	import StateGallery from '$llama-ui-stories/helpers/StateGallery.svelte';
	import StateGalleryItem from '$llama-ui-stories/helpers/StateGalleryItem.svelte';
	import { expect, within } from 'storybook/test';

	const { Story } = defineMeta({
		component: McpLlamaServerCard,
		parameters: {
			layout: 'centered'
		},
		title: 'Llama Chat/MCP/McpLlamaServer'
	});

	function tool(server: string, name: string, description: string): ServerToolInfo {
		const id = `${server}_${name}`;

		return {
			definition: { function: { description, name: id, parameters: {} }, type: 'function' },
			display_name: id,
			mcp_server: server,
			permissions: { write: false },
			tool: id,
			type: ServerToolType.MCP,
			uses_cwd: false
		};
	}

	// what llama-server started with `--mcp-servers-config` runs: local commands, over stdio
	const imcp: LlamaServerMcpServer = {
		groupId: 'llama-server:imcp',
		name: 'imcp',
		tools: [
			tool('imcp', 'weather_current', 'Current weather at a location'),
			tool('imcp', 'contacts_search', 'Search your contacts by name, phone number or email'),
			tool('imcp', 'calendar_events', 'List the events of a calendar')
		]
	};
	const filesystem: LlamaServerMcpServer = {
		groupId: 'llama-server:filesystem',
		name: 'filesystem',
		tools: [tool('filesystem', 'read_text_file', 'Read a text file')]
	};
</script>

<Story
	asChild
	name="Run by llama-server"
	play={async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await expect(canvas.getByText('imcp')).toBeInTheDocument();
		await expect(canvas.getAllByText('Run by llama-server')).toHaveLength(2);
		await expect(canvas.getByRole('switch', { name: 'Use the tools of imcp' })).toBeChecked();
		await expect(canvas.getByText('3 tools available · Show details')).toBeInTheDocument();
	}}
>
	<StateGallery columns={2} minItemWidth="24rem">
		<StateGalleryItem label="Several tools">
			<McpLlamaServerCard server={imcp} />
		</StateGalleryItem>

		<StateGalleryItem label="One tool">
			<McpLlamaServerCard server={filesystem} />
		</StateGalleryItem>
	</StateGallery>
</Story>

<Story
	asChild
	name="How to add a local server"
	play={async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await expect(canvas.getByText(/llama-server --mcp-servers-config mcp.json/)).toBeVisible();
		await expect(canvas.getByRole('button', { name: 'Copy the config example' })).toBeVisible();
	}}
>
	<div class="w-[36rem] max-w-full">
		<McpLlamaServerHowTo open />
	</div>
</Story>
