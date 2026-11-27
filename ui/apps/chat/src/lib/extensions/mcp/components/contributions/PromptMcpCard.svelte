<script lang="ts">
	import type { PromptCardProps } from '../../../points/prompts';
	import { parseMcpPromptId } from '../../prompt-ids';
	import ChatMessageMcpPromptContent from '../chat/ChatMessageMcpPrompt/ChatMessageMcpPromptContent.svelte';
	import { AttachmentType } from '#lib/enums/index.ts';
	import type { DatabaseMessageExtraMcpPrompt } from '#lib/types/index.ts';

	let { class: className = '', content, name, promptId }: PromptCardProps = $props();

	// a system message keeps its MCP prompt by id only: the server and the prompt's name are in it
	let prompt = $derived.by((): DatabaseMessageExtraMcpPrompt | null => {
		const parsed = parseMcpPromptId(promptId);

		if (!parsed) return null;

		return {
			content,
			name,
			promptName: parsed.promptName,
			serverName: parsed.serverName,
			type: AttachmentType.MCP_PROMPT
		};
	});
</script>

{#if prompt}
	<ChatMessageMcpPromptContent class={className} {prompt} />
{/if}
