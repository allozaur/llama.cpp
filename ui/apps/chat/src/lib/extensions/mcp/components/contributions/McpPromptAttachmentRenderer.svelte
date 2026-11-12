<script lang="ts">
	import type { AttachmentRendererProps } from '../../../points/renderers';
	import ChatAttachmentsListItemMcpPrompt from '../chat/ChatAttachmentsListItemMcpPrompt.svelte';
	import { AttachmentType } from '$lib/enums';
	import type { DatabaseMessageExtraMcpPrompt } from '$lib/types';

	let {
		class: className = '',
		item,
		onRemove,
		readonly = false
	}: AttachmentRendererProps = $props();

	// a prompt stored with a message, or one still pending in the chat form
	let prompt = $derived.by((): DatabaseMessageExtraMcpPrompt | null => {
		if (item.attachment?.type === AttachmentType.MCP_PROMPT) return item.attachment;

		const pending = item.uploadedFile?.mcpPrompt;

		if (!pending) return null;

		return {
			arguments: pending.arguments,
			content: item.textContent ?? '',
			name: item.name,
			promptName: pending.promptName,
			serverName: pending.serverName,
			type: AttachmentType.MCP_PROMPT
		};
	});
</script>

{#if prompt}
	<ChatAttachmentsListItemMcpPrompt
		class="max-w-[300px] min-w-[200px] flex-shrink-0 {className}"
		isLoading={item.isLoading}
		loadError={item.loadError}
		{onRemove}
		{prompt}
		{readonly}
	/>
{/if}
