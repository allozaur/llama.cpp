<script lang="ts">
	import { CONVERSATION_SHARE_TEXT as TEXT, ConversationShareScope } from './constants';
	import { buildConversationTrace, buildTracePreview } from './conversation-trace';
	import { conversationShare, huggingFace } from './huggingface.svelte';
	import type { HfShareScope, HfTraceFile } from '@ggml-org/llama-huggingface';
	import { HfShareDialog } from '@ggml-org/llama-huggingface/svelte';
	import { ConversationTransferService } from '#lib/services/conversation-transfer.service.ts';
	import { conversationsStore } from '#lib/stores/index.ts';
	import { copyToClipboard, filterByLeafNodeId } from '#lib/utils/index.ts';
	import { toast } from 'svelte-sonner';

	// what a conversation is, for the share dialog: its branches as scopes, and its trace

	let options = $derived(conversationShare.request);
	let conversation = $derived(
		conversationsStore.conversations.find((conv) => conv.id === options?.conversationId)
	);

	let messages = $state<DatabaseMessage[]>([]);

	$effect.pre(() => {
		const conversationId = options?.conversationId;

		messages = [];

		if (!conversationId) return;

		void conversationsStore.getConversationMessages(conversationId).then((loaded) => {
			if (conversationShare.request?.conversationId === conversationId) messages = loaded;
		});
	});

	function scopeOf(id: ConversationShareScope, label: string, leafId: string): HfShareScope {
		const path = filterByLeafNodeId(messages, leafId);

		return {
			// nothing to count while the messages load
			detail: path.length ? TEXT.messageCount(path.length) : undefined,
			hasAttachments: path.some((message) => !!message.extra?.length),
			id,
			isEmpty: !path.length,
			label
		};
	}

	let scopes = $derived([
		...(options?.messageId
			? [scopeOf(ConversationShareScope.UP_TO_MESSAGE, TEXT.SCOPE_UP_TO_MESSAGE, options.messageId)]
			: []),
		scopeOf(ConversationShareScope.ALL, TEXT.SCOPE_ALL, conversation?.currNode ?? '')
	]);

	async function buildTrace(scope: string, includeAttachments: boolean): Promise<HfTraceFile> {
		const conversationId = options?.conversationId ?? '';
		const [exported] = await conversationsStore.getConversationsForExport([conversationId]);

		if (!exported) throw new Error(TEXT.CONVERSATION_NOT_FOUND);

		const trace = buildConversationTrace(exported, {
			includeAttachments,
			upToMessageId: scope === ConversationShareScope.UP_TO_MESSAGE ? options?.messageId : undefined
		});

		return {
			commitMessage: TEXT.commitMessage(trace.conv.name),
			content: ConversationTransferService.serializeSessionToJsonl(trace),
			path: ConversationTransferService.generateConversationFilename(trace.conv, trace.messages),
			preview: buildTracePreview(trace)
		};
	}
</script>

<HfShareDialog
	bind:open={() => options !== null, (open) => !open && conversationShare.close()}
	account={huggingFace}
	{buildTrace}
	onCopyLink={(url) => void copyToClipboard(url, TEXT.LINK_COPIED)}
	onShared={() => toast.success(TEXT.SHARED)}
	{scopes}
	subject={conversation ? TEXT.subject(conversation.name) : TEXT.SUBJECT_FALLBACK}
/>
