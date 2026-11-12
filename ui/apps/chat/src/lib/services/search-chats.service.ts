/**
 * SearchChatsService - executor for the search_chats browser tool
 *
 * Reads conversations and messages in readonly transactions over IndexedDB, or through the
 * active storage backend when conversations live elsewhere; matching and formatting live in
 * utils/search-chats.
 */

import { DatabaseService } from './database.service';
import type { ToolExecutionResult } from '$lib/types';
import type { DatabaseConversation, DatabaseMessage } from '$lib/types/database';
import {
	parseSearchChatsParams,
	searchChats,
	SearchChatsError,
	type SearchChatsTimeRange
} from '$lib/utils/search-chats';

async function loadConversations(ids?: string[]): Promise<DatabaseConversation[]> {
	if (!DatabaseService.usesIndexedDb) {
		const all = await DatabaseService.getAllConversations();

		if (!ids) return all;

		const wanted = new Set(ids);

		return all.filter((c) => wanted.has(c.id));
	}

	return DatabaseService.readOnly(async ({ conversations }) => {
		if (!ids) return conversations.toArray();

		const found = await conversations.bulkGet(ids);

		return found.filter((c): c is DatabaseConversation => !!c);
	});
}

/**
 * Attachment payloads (base64 media, file text) are dropped as rows stream in, only their
 * names are kept; a library prompt carries no payload, so it is kept as it is
 */
function withoutPayloads({ extra, ...message }: DatabaseMessage): DatabaseMessage {
	return {
		...message,
		extra: extra?.map((e) =>
			'name' in e ? { name: e.name, type: e.type } : e
		) as DatabaseMessage['extra']
	};
}

/** One transaction, so the range lookup and the read see the same data */
async function loadMessages(
	convIds: string[] | null,
	range?: SearchChatsTimeRange
): Promise<DatabaseMessage[]> {
	if (!DatabaseService.usesIndexedDb) return loadMessagesFromBackend(convIds, range);

	return DatabaseService.readOnly(async ({ messages }) => {
		let ids = convIds;

		if (range) {
			const { from, to } = range;
			const index = messages.where('timestamp');
			const inRange =
				from !== undefined && to !== undefined
					? index.between(from, to, true, false)
					: from !== undefined
						? index.aboveOrEqual(from)
						: index.below(to);
			const active = new Set<string>();

			await inRange.each((m) => active.add(m.convId));
			ids = ids ? ids.filter((id) => active.has(id)) : [...active];
		}

		const rows: DatabaseMessage[] = [];

		await (ids ? messages.where('convId').anyOf(ids) : messages.toCollection()).each((m) =>
			rows.push(withoutPayloads(m))
		);

		return rows;
	});
}

/** The same read without IndexedDB's indexes, for conversations kept by a storage adapter */
async function loadMessagesFromBackend(
	convIds: string[] | null,
	range?: SearchChatsTimeRange
): Promise<DatabaseMessage[]> {
	const ids = convIds ?? (await DatabaseService.getAllConversations()).map((c) => c.id);
	const byConv = await Promise.all(ids.map((id) => DatabaseService.getConversationMessages(id)));
	const inRange = (t: number) =>
		(range?.from === undefined || t >= range.from) && (range?.to === undefined || t < range.to);

	return byConv
		.filter((messages) => !range || messages.some((m) => inRange(m.timestamp)))
		.flat()
		.map(withoutPayloads);
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
