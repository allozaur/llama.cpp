<script lang="ts">
	import type { SystemPromptCardProps } from '../../../points/system-prompts';
	import ChatMessageMcpPromptContent from '../chat/ChatMessageMcpPrompt/ChatMessageMcpPromptContent.svelte';
	import { AttachmentType } from '$lib/enums';
	import type { DatabaseMessageExtraMcpPrompt } from '$lib/types';
	import { parseMcpPromptId } from '$lib/utils';

	let { class: className = '', content, promptId, title }: SystemPromptCardProps = $props();

	// a system message keeps its MCP prompt by name only: the server and prompt names are in its id
	let prompt = $derived.by((): DatabaseMessageExtraMcpPrompt | null => {
		const parsed = parseMcpPromptId(promptId);

		if (!parsed) return null;

		return {
			content,
			name: title,
			promptName: parsed.promptName,
			serverName: parsed.serverName,
			type: AttachmentType.MCP_PROMPT
		};
	});
</script>

{#if prompt}
	<ChatMessageMcpPromptContent class={className} {prompt} />
{/if}
