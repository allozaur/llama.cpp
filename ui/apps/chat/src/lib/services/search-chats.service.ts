/**
 * SearchChatsService - executor for the search_chats browser tool
 *
 * Reads conversations and messages through DatabaseService; matching and formatting live in utils/search-chats.
 */

import { DatabaseService } from './database.service';
import type { DatabaseConversation, DatabaseMessage } from '#lib/types/database.js';
import type { ToolExecutionResult } from '#lib/types/index.ts';
import {
	attachmentName,
	parseSearchChatsParams,
	searchChats,
	SearchChatsError,
	type SearchChatsTimeRange
} from '#lib/utils/search-chats.ts';

function loadConversations(ids?: string[]): Promise<DatabaseConversation[]> {
	return ids ? DatabaseService.getConversations(ids) : DatabaseService.getAllConversations();
}

/** Attachment payloads (base64 media, file text) are dropped as rows stream in, only their names are kept */
function withoutPayloads({ extra, ...message }: DatabaseMessage): DatabaseMessage {
	return {
		...message,
		extra: extra?.map((e) => ({
			name: attachmentName(e),
			type: e.type
		})) as DatabaseMessage['extra']
	};
}

async function loadMessages(
	convIds: string[] | null,
	range?: SearchChatsTimeRange
): Promise<DatabaseMessage[]> {
	const rows: DatabaseMessage[] = [];

	await DatabaseService.scanMessages(convIds, (m) => rows.push(withoutPayloads(m)), range);

	return rows;
}

const loader = { messages: loadMessages };

export class SearchChatsService {
	/** `currentConversationId` is hidden from results unless the model sets include_current */
	static async executeTool(
		args: Record<string, unknown>,
		currentConversationId?: string
	): Promise<ToolExecutionResult> {
		try {
			const params = parseSearchChatsParams(args);
			const conversations = await loadConversations(params.byConvIds);
			const content = await searchChats(conversations, params, loader, currentConversationId);

			return { content, isError: false };
		} catch (err) {
			if (err instanceof SearchChatsError)
				return { content: `Error: ${err.message}`, isError: true };

			throw err;
		}
	}
}
