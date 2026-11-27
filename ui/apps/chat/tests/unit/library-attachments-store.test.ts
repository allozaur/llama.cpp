// The Library reads the files of conversations a page at a time: it goes on from the
// oldest message of the page before, never lists a message twice, starts over for a
// search, and drops a page that arrives after it was cleared.

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('#lib/services/database.service.ts', () => ({
	DatabaseService: { getMessagesHolding: vi.fn() }
}));

import { LIBRARY_ATTACHMENTS_PAGE_SIZE } from '#lib/constants/index.ts';
import { AttachmentType, MessageRole, MessageType } from '#lib/enums/index.ts';
import { DatabaseService } from '#lib/services/database.service.ts';
import { libraryAttachmentsStore } from '#lib/stores/library-attachments.svelte.ts';
import type { DatabaseMessage } from '#lib/types/database.js';

const getMessagesHolding = vi.mocked(DatabaseService.getMessagesHolding);

function message(id: string, timestamp: number, names: string[] = [`${id}.png`]): DatabaseMessage {
	return {
		children: [],
		content: '',
		convId: 'c1',
		extra: names.map((name) => ({ base64Url: '', name, type: AttachmentType.IMAGE })),
		id,
		parent: null,
		role: MessageRole.USER,
		timestamp,
		type: MessageType.TEXT
	} as DatabaseMessage;
}

/** A full page of messages, newest first, ending at `oldest`. */
function page(prefix: string, oldest: number): DatabaseMessage[] {
	return Array.from({ length: LIBRARY_ATTACHMENTS_PAGE_SIZE }, (_, index) =>
		message(`${prefix}${index}`, oldest + LIBRARY_ATTACHMENTS_PAGE_SIZE - 1 - index)
	);
}

describe('libraryAttachmentsStore', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		libraryAttachmentsStore.clear();
	});

	it('reads the newest files first and knows there are no more after a short page', async () => {
		getMessagesHolding.mockResolvedValue([
			message('b', 2000, ['b1.png', 'b2.png']),
			message('a', 1000)
		]);

		await libraryAttachmentsStore.search('');

		expect(getMessagesHolding).toHaveBeenCalledWith(
			expect.any(Function),
			LIBRARY_ATTACHMENTS_PAGE_SIZE,
			undefined
		);
		expect(libraryAttachmentsStore.items.map((item) => item.id)).toEqual(['b:0', 'b:1', 'a:0']);
		expect(libraryAttachmentsStore.hasMore).toBe(false);
		expect(libraryAttachmentsStore.isLoading).toBe(false);
	});

	it('goes on from the oldest message of the page before, without listing one twice', async () => {
		const first = page('new', 5000);
		// sent in the same millisecond as the last message of the first page
		const sameMoment = message('twin', 5000);

		getMessagesHolding.mockResolvedValueOnce(first);
		await libraryAttachmentsStore.search('');

		expect(libraryAttachmentsStore.hasMore).toBe(true);

		getMessagesHolding.mockResolvedValueOnce([first.at(-1)!, sameMoment, message('old', 4000)]);
		await libraryAttachmentsStore.loadMore();

		expect(getMessagesHolding).toHaveBeenLastCalledWith(
			expect.any(Function),
			LIBRARY_ATTACHMENTS_PAGE_SIZE,
			5000
		);
		expect(libraryAttachmentsStore.items).toHaveLength(LIBRARY_ATTACHMENTS_PAGE_SIZE + 2);
		expect(libraryAttachmentsStore.items.slice(-2).map((item) => item.messageId)).toEqual([
			'twin',
			'old'
		]);
		expect(libraryAttachmentsStore.hasMore).toBe(false);
	});

	it('stops when a full page brings nothing new', async () => {
		const first = page('same', 5000);

		getMessagesHolding.mockResolvedValue(first);
		await libraryAttachmentsStore.search('');
		await libraryAttachmentsStore.loadMore();

		expect(libraryAttachmentsStore.items).toHaveLength(LIBRARY_ATTACHMENTS_PAGE_SIZE);
		expect(libraryAttachmentsStore.hasMore).toBe(false);
	});

	it('asks the database only for messages with a file that matches the search', async () => {
		getMessagesHolding.mockResolvedValue([message('m', 1000, ['Map.png', 'notes.png'])]);

		await libraryAttachmentsStore.search('map');

		const holds = getMessagesHolding.mock.calls[0][0];

		expect(holds(message('x', 1, ['city-map.png']))).toBe(true);
		expect(holds(message('y', 1, ['notes.png']))).toBe(false);
		expect(libraryAttachmentsStore.items.map((item) => item.attachment.name)).toEqual(['Map.png']);
	});

	it('starts over for a new search', async () => {
		getMessagesHolding.mockResolvedValueOnce(page('first', 5000));
		await libraryAttachmentsStore.search('');

		getMessagesHolding.mockResolvedValueOnce([message('hit', 9000)]);
		await libraryAttachmentsStore.search('hit');

		expect(getMessagesHolding).toHaveBeenLastCalledWith(
			expect.any(Function),
			LIBRARY_ATTACHMENTS_PAGE_SIZE,
			undefined
		);
		expect(libraryAttachmentsStore.items.map((item) => item.messageId)).toEqual(['hit']);
	});

	it('drops a page that arrives after the Library was left', async () => {
		let deliver!: (messages: DatabaseMessage[]) => void;

		getMessagesHolding.mockReturnValueOnce(
			new Promise<DatabaseMessage[]>((resolve) => {
				deliver = resolve;
			})
		);

		const loading = libraryAttachmentsStore.search('');

		libraryAttachmentsStore.clear();
		deliver([message('late', 1000)]);
		await loading;

		expect(libraryAttachmentsStore.items).toEqual([]);
		expect(libraryAttachmentsStore.isLoading).toBe(false);
	});

	it('does not read two pages at once, or any once none are left', async () => {
		getMessagesHolding.mockResolvedValue([message('a', 1000)]);

		await Promise.all([libraryAttachmentsStore.search(''), libraryAttachmentsStore.loadMore()]);
		await libraryAttachmentsStore.loadMore();

		expect(getMessagesHolding).toHaveBeenCalledOnce();
	});

	it('lists nothing more after a read fails', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		getMessagesHolding.mockRejectedValue(new Error('database is closed'));

		await libraryAttachmentsStore.search('');

		expect(libraryAttachmentsStore.items).toEqual([]);
		expect(libraryAttachmentsStore.hasMore).toBe(false);
		expect(libraryAttachmentsStore.isLoading).toBe(false);
	});
});
