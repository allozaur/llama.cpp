/**
 * The open conversation's context breakdown, for the context gauge's panel and
 * the Context side card.
 *
 * The total is llama-server's count of the last request and its reply. The
 * parts come from what the conversation holds: its messages (from the last
 * compaction on), and the tool definitions of the last request its flow sent,
 * or, with none in memory (after a reload), the tools the next one would send.
 */

import { SYSTEM_MESSAGE_PLACEHOLDER } from '#lib/constants/index.ts';
import { MessageRole, MessageType } from '#lib/enums/index.ts';
import {
	agenticStore,
	contextStatsStore,
	conversationsStore,
	toolsStore
} from '#lib/stores/index.ts';
import type { DatabaseMessage } from '#lib/types/index.ts';
import {
	buildContextBreakdown,
	type ContextBreakdown,
	type ContextMessage,
	sliceAtLastCompaction
} from '#lib/utils/index.ts';

function contextMessages(messages: DatabaseMessage[]): ContextMessage[] {
	return sliceAtLastCompaction(messages)
		.filter(
			(m) =>
				m.type !== MessageType.ROOT &&
				!(m.role === MessageRole.SYSTEM && m.content === SYSTEM_MESSAGE_PLACEHOLDER)
		)
		.map((m) => ({
			content: m.content,
			reasoning_content: m.reasoningContent,
			role: m.role,
			tool_calls: m.toolCalls
		}));
}

export function useContextBreakdown(): { readonly current: ContextBreakdown } {
	const breakdown = $derived.by(() => {
		const conversationId = conversationsStore.activeConversation?.id ?? null;
		const model = contextStatsStore.activeModelId ?? '';
		const preview = conversationId
			? agenticStore.previewRequestTools(conversationId, model)
			: { deferred: [], tools: [] };
		const sent = conversationId ? agenticStore.getLastRequest(conversationId) : null;
		// tools turned off since the last request send none now
		const request = sent && preview.tools.length > 0 ? sent : preview;

		return buildContextBreakdown({
			contextTotal: contextStatsStore.contextTotal,
			deferred: request.deferred,
			messages: contextMessages(conversationsStore.activeMessages as DatabaseMessage[]),
			toolInfo: (name) => ({
				server: toolsStore.getToolServerLabel(name),
				source: toolsStore.getToolSource(name)
			}),
			tools: request.tools,
			usedTokens: contextStatsStore.contextUsed
		});
	});

	return {
		get current() {
			return breakdown;
		}
	};
}
