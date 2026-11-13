// Attachments an extension holds outside the chat form (MCP's resources) go
// with the message that is sent, once: a message queued behind a busy chat
// leaves them where they are, and without the extension nothing is added.

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('$lib/services/database.service', () => ({
	DatabaseService: {
		getConversation: vi.fn(),
		getConversationMessages: vi.fn(),
		updateConversation: vi.fn(),
		updateCurrentNode: vi.fn()
	}
}));

import { AttachmentType } from '$lib/enums';
import type { ComposerAttachments } from '$lib/extensions';
import { extensions } from '$lib/extensions';
import { DatabaseService } from '$lib/services/database.service';
import { chatStore } from '$lib/stores/chat/index.svelte';
import { conversationsStore } from '$lib/stores/conversations/index.svelte';
import type { DatabaseMessageExtra } from '$lib/types';
import type { Component } from 'svelte';

const CONV_ID = 'conv-a';
const OWN: DatabaseMessageExtra = {
	content: 'notes',
	name: 'notes.txt',
	type: AttachmentType.TEXT
};
const PENDING: DatabaseMessageExtra = {
	content: 'readme',
	name: 'README.md',
	serverName: 'github',
	type: AttachmentType.MCP_RESOURCE,
	uri: 'repo://README.md'
};

// what the extension holds until a message is sent
let held: DatabaseMessageExtra[] = [];

const source: ComposerAttachments = {
	component: (() => {}) as unknown as Component,
	consume: vi.fn(() => {
		const extras = held;

		held = [];

		return extras;
	}),
	hasPending: () => held.length > 0
};

extensions.register({
	description: 'Holds attachments outside the chat form',
	id: 'test-attachments',
	load: async () => ({
		default: {
			activate(ctx) {
				ctx.contribute('composerAttachments', source);
			}
		}
	}),
	name: 'Test attachments'
});

/** Send up to the point where the user message is stored, and return the extras it got. */
async function sendAndCaptureExtras(extras?: DatabaseMessageExtra[]) {
	const addMessage = vi
		.spyOn(chatStore, 'addMessage')
		.mockRejectedValue(new DOMException('stop here', 'AbortError'));

	await chatStore.sendMessage('hello', extras);

	return addMessage.mock.lastCall?.[4];
}

beforeEach(async () => {
	vi.restoreAllMocks();
	vi.mocked(source.consume).mockClear();
	held = [];
	chatStore.clearPendingMessage(CONV_ID);

	vi.mocked(DatabaseService.getConversation).mockResolvedValue({
		currNode: null,
		id: CONV_ID,
		lastModified: 1000,
		name: CONV_ID
	});
	vi.mocked(DatabaseService.getConversationMessages).mockResolvedValue([]);

	expect(await conversationsStore.loadConversation(CONV_ID)).toBe(true);

	await extensions.setEnabled('test-attachments', true);
});

describe('pending composer attachments on send', () => {
	it('appends them to the extras of the message and clears their source', async () => {
		held = [PENDING];

		expect(await sendAndCaptureExtras([OWN])).toEqual([OWN, PENDING]);
		expect(source.consume).toHaveBeenCalledTimes(1);
		expect(source.hasPending()).toBe(false);
	});

	it('sends them with a message that has no extras of its own', async () => {
		held = [PENDING];

		expect(await sendAndCaptureExtras()).toEqual([PENDING]);
	});

	it('leaves the extras of the message as they are when nothing is pending', async () => {
		const own = [OWN];

		expect(await sendAndCaptureExtras(own)).toBe(own);
		expect(await sendAndCaptureExtras()).toBeUndefined();
	});

	it('keeps them for the next send when the message is queued behind a busy chat', async () => {
		held = [PENDING];
		chatStore.setChatLoading(CONV_ID, true);

		try {
			await chatStore.sendMessage('queued', [OWN]);
		} finally {
			chatStore.setChatLoading(CONV_ID, false);
		}

		expect(source.consume).not.toHaveBeenCalled();
		expect(source.hasPending()).toBe(true);
		expect(chatStore.getPendingMessageContent(CONV_ID)).toBe('queued');
	});

	it('adds nothing once the extension is off', async () => {
		held = [PENDING];
		await extensions.setEnabled('test-attachments', false);

		expect(await sendAndCaptureExtras([OWN])).toEqual([OWN]);
		expect(source.consume).not.toHaveBeenCalled();
		expect(source.hasPending()).toBe(true);
	});
});
