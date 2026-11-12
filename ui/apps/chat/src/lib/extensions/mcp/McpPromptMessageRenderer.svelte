<script lang="ts">
	import type { MessageRendererProps } from '../points/renderers';
	import { ChatMessageMcpPrompt } from '$lib/components/app';
	import { AttachmentType } from '$lib/enums';

	let { class: className = '', message }: MessageRendererProps = $props();

	// the renderer claims only a message whose single extra is an MCP prompt
	let mcpPrompt = $derived.by(() => {
		const extra = message.extra?.[0];

		return extra?.type === AttachmentType.MCP_PROMPT ? extra : null;
	});
</script>

{#if mcpPrompt}
	<ChatMessageMcpPrompt class={className} {mcpPrompt} {message} />
{/if}
