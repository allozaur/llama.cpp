/**
 * libraryAttachmentsStore - The files of every conversation, for the Library
 *
 * Reads the messages that hold files a page at a time, newest first, so the
 * Library never loads a whole history at once. What it read is dropped when
 * the Library is left: the files stay in the database.
 */

import { LIBRARY_ATTACHMENTS_PAGE_SIZE } from '#lib/constants/index.ts';
import { DatabaseService } from '#lib/services/database.service.ts';
import { type LibraryAttachment, libraryAttachmentsOf } from '#lib/utils/index.ts';

class LibraryAttachmentsStore {
	/** Whether older messages may still hold files that match. */
	hasMore = $state(true);
	isLoading = $state(false);
	/** The files read so far, newest first. */
	items = $state.raw<LibraryAttachment[]>([]);

	private messageIds = new Set<string>();
	private oldest: number | undefined;
	private query = '';
	// a search or a reset that starts while a page loads makes that page stale
	private run = 0;

	/** Drops what was read, to free the files' data once the Library is left. */
	clear(): void {
		this.run++;
		this.messageIds = new Set();
		this.oldest = undefined;
		this.items = [];
		this.hasMore = true;
		this.isLoading = false;
	}

	/** Reads the next page of files. Does nothing while a page loads, or when none are left. */
	async loadMore(): Promise<void> {
		if (this.isLoading || !this.hasMore) return;

		const run = this.run;
		const query = this.query;

		this.isLoading = true;

		try {
			const messages = await DatabaseService.getMessagesHolding(
				(message) => libraryAttachmentsOf(message, query).length > 0,
				LIBRARY_ATTACHMENTS_PAGE_SIZE,
				this.oldest
			);

			if (run !== this.run) return;

			// the page starts at the last timestamp of the one before, so that messages
			// sent in the same millisecond are not skipped: the ones already read come again
			const fresh = messages.filter((message) => !this.messageIds.has(message.id));

			for (const message of fresh) this.messageIds.add(message.id);

			this.oldest = messages.at(-1)?.timestamp ?? this.oldest;
			this.items = [
				...this.items,
				...fresh.flatMap((message) => libraryAttachmentsOf(message, query))
			];
			this.hasMore = messages.length === LIBRARY_ATTACHMENTS_PAGE_SIZE && fresh.length > 0;
		} catch (error) {
			if (run !== this.run) return;

			console.error('Failed to read the attachments of conversations:', error);
			this.hasMore = false;
		} finally {
			if (run === this.run) this.isLoading = false;
		}
	}

	/** Starts over with the files whose name holds `query`, from the newest message. */
	async search(query: string): Promise<void> {
		this.clear();
		this.query = query;

		await this.loadMore();
	}
}

export const libraryAttachmentsStore = new LibraryAttachmentsStore();
