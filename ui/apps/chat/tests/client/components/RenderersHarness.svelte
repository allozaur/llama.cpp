<script lang="ts">
	import * as Tooltip from '@ggml/llama-ui/ui/tooltip';
	import ChatAttachmentsList from '$lib/components/app/chat/ChatAttachments/ChatAttachmentsList/ChatAttachmentsList.svelte';
	import ChatMessage from '$lib/components/app/chat/ChatMessages/ChatMessage/ChatMessage.svelte';
	import type { ChatMessageActions, DatabaseMessage, DatabaseMessageExtra } from '$lib/types';

	interface Props {
		attachments?: DatabaseMessageExtra[];
		message?: DatabaseMessage;
	}

	let { attachments = [], message }: Props = $props();

	const chatActions: ChatMessageActions = {
		continueAssistantMessage: () => {},
		copy: () => {},
		delete: () => {},
		editUserMessagePreserveResponses: () => {},
		editWithBranching: () => {},
		editWithReplacement: () => {},
		forkConversation: () => {},
		navigateToSibling: () => {},
		regenerateCompaction: () => {},
		regenerateWithBranching: () => {}
	};
</script>

<!-- one message, or a sent message's attachments, with the tooltip provider +layout.svelte gives them -->
<Tooltip.Provider>
	{#if message}
		<ChatMessage {chatActions} {message} />
	{:else}
		<ChatAttachmentsList {attachments} readonly />
	{/if}
</Tooltip.Provider>
