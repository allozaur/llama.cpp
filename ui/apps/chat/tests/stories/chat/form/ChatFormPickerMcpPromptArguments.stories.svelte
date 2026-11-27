<script lang="ts" module>
	import { mcpPrompts, mcpServers, seedStores } from './fixtures';
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import ChatFormPickerMcpPromptArguments from '#lib/extensions/mcp/components/chat/ChatFormPickerMcpPrompts/ChatFormPickerMcpPromptArguments.svelte';
	import { fn } from 'storybook/test';
	import type { ComponentProps } from 'svelte';

	const { Story } = defineMeta({
		args: {
			isOpen: true,
			onClose: fn(),
			onSubmit: fn(),
			prompt: mcpPrompts[0]
		},
		component: ChatFormPickerMcpPromptArguments,
		parameters: {
			layout: 'centered'
		},
		title: 'Llama Chat/Chat/ChatForm/ChatFormPickerMcpPromptArguments'
	});
</script>

{#snippet template(args: ComponentProps<typeof ChatFormPickerMcpPromptArguments>)}
	<!-- the popover anchors to its parent and opens above it -->
	<div class="relative mt-96 h-12 w-[32rem] rounded-3xl border">
		<ChatFormPickerMcpPromptArguments {...args} />
	</div>
{/snippet}

<Story beforeEach={() => seedStores({ mcpServers })} name="Default" {template} />

<Story
	args={{ prompt: mcpPrompts[2] }}
	beforeEach={() => seedStores({ mcpServers })}
	name="OneArgument"
	{template}
/>
