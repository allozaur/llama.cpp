// The core draws a message or an attachment itself unless an extension's
// renderer claims it. These pin how a renderer is picked, and what the core
// falls back to for the MCP attachment kinds when no renderer claims them.

import { AttachmentType, MessageRole, MessageType } from '$lib/enums';
import type {
	AttachmentRenderer,
	AttachmentRendererProps,
	Extension,
	MessageRenderer,
	MessageRendererProps
} from '$lib/extensions';
import { ExtensionRegistry, findAttachmentRenderer, findMessageRenderer } from '$lib/extensions';
import type { ChatAttachmentDisplayItem, DatabaseMessage, DatabaseMessageExtra } from '$lib/types';
import { getAttachmentDisplayItems } from '$lib/utils/attachment-display';
import { isTextFile } from '$lib/utils/attachment-type';
import type { Component } from 'svelte';
import { describe, expect, it } from 'vitest';

const MCP_PROMPT: DatabaseMessageExtra = {
	content: 'Review this file.',
	name: 'code_review',
	promptName: 'code_review',
	serverName: 'github',
	type: AttachmentType.MCP_PROMPT
};
const MCP_RESOURCE: DatabaseMessageExtra = {
	content: '# llama.cpp',
	mimeType: 'text/markdown',
	name: 'README.md',
	serverName: 'filesystem',
	type: AttachmentType.MCP_RESOURCE,
	uri: 'file:///README.md'
};
const TEXT: DatabaseMessageExtra = {
	content: 'notes',
	name: 'notes.txt',
	type: AttachmentType.TEXT
};
// never mounted here: only the identity of a renderer matters
const messageComponent = (() => {}) as unknown as Component<MessageRendererProps>;
const attachmentComponent = (() => {}) as unknown as Component<AttachmentRendererProps>;

function makeMessage(fields: Partial<DatabaseMessage> = {}): DatabaseMessage {
	return {
		children: [],
		content: '',
		convId: 'conv-1',
		id: 'message-1',
		parent: null,
		role: MessageRole.USER,
		timestamp: 0,
		type: MessageType.TEXT,
		...fields
	};
}

function displayItems(attachments: DatabaseMessageExtra[]): ChatAttachmentDisplayItem[] {
	return getAttachmentDisplayItems({ attachments });
}

describe('findMessageRenderer', () => {
	const assistantOnly: MessageRenderer = {
		component: messageComponent,
		match: (message) => message.role === MessageRole.ASSISTANT
	};
	const everything: MessageRenderer = {
		component: messageComponent,
		forkable: false,
		match: () => true
	};

	it('finds nothing when no renderer is contributed', () => {
		expect(findMessageRenderer([], makeMessage())).toBeUndefined();
	});

	it('finds nothing when no renderer claims the message', () => {
		expect(findMessageRenderer([assistantOnly], makeMessage())).toBeUndefined();
	});

	it('picks the first renderer that claims the message', () => {
		const assistant = makeMessage({ role: MessageRole.ASSISTANT });

		expect(findMessageRenderer([assistantOnly, everything], assistant)).toBe(assistantOnly);
		expect(findMessageRenderer([everything, assistantOnly], assistant)).toBe(everything);
		expect(findMessageRenderer([assistantOnly, everything], makeMessage())).toBe(everything);
	});
});

describe('findAttachmentRenderer', () => {
	const mcpPromptOnly: AttachmentRenderer = {
		component: attachmentComponent,
		match: (item) => item.attachment?.type === AttachmentType.MCP_PROMPT
	};
	const everything: AttachmentRenderer = { component: attachmentComponent, match: () => true };

	it('finds nothing when no renderer is contributed', () => {
		const [item] = displayItems([MCP_PROMPT]);

		expect(findAttachmentRenderer([], item)).toBeUndefined();
	});

	it('finds nothing when no renderer claims the item', () => {
		const [item] = displayItems([TEXT]);

		expect(findAttachmentRenderer([mcpPromptOnly], item)).toBeUndefined();
	});

	it('picks the first renderer that claims the item', () => {
		const [prompt] = displayItems([MCP_PROMPT]);
		const [text] = displayItems([TEXT]);

		expect(findAttachmentRenderer([mcpPromptOnly, everything], prompt)).toBe(mcpPromptOnly);
		expect(findAttachmentRenderer([everything, mcpPromptOnly], prompt)).toBe(everything);
		expect(findAttachmentRenderer([mcpPromptOnly, everything], text)).toBe(everything);
	});
});

describe('renderer contributions', () => {
	it('are read from the registry while the extension is on, and gone once it is off', async () => {
		const registry = new ExtensionRegistry();
		const messageRenderer: MessageRenderer = { component: messageComponent, match: () => true };
		const attachmentRenderer: AttachmentRenderer = {
			component: attachmentComponent,
			match: () => true
		};
		const extension: Extension = {
			activate(ctx) {
				ctx.contribute('messageRenderers', messageRenderer);
				ctx.contribute('attachmentRenderers', attachmentRenderer);
			}
		};
		const message = makeMessage();
		const [item] = displayItems([MCP_RESOURCE]);

		registry.register({
			description: 'A test extension',
			id: 'test',
			load: async () => ({ default: extension }),
			name: 'Test'
		});

		expect(
			findMessageRenderer(registry.contributions('messageRenderers'), message)
		).toBeUndefined();

		await registry.activateEnabled();

		expect(findMessageRenderer(registry.contributions('messageRenderers'), message)).toBe(
			messageRenderer
		);
		expect(findAttachmentRenderer(registry.contributions('attachmentRenderers'), item)).toBe(
			attachmentRenderer
		);

		await registry.setEnabled('test', false);

		expect(
			findMessageRenderer(registry.contributions('messageRenderers'), message)
		).toBeUndefined();
		expect(
			findAttachmentRenderer(registry.contributions('attachmentRenderers'), item)
		).toBeUndefined();
	});
});

describe('attachments no renderer claims', () => {
	it('read as text files when they carry text, so the default chip and preview show them', () => {
		expect(isTextFile(MCP_PROMPT)).toBe(true);
		expect(isTextFile(MCP_RESOURCE)).toBe(true);
	});

	it('keep their name and text as display items', () => {
		const [resource, prompt] = displayItems([MCP_PROMPT, MCP_RESOURCE]);

		expect(prompt).toMatchObject({ name: 'code_review', textContent: 'Review this file.' });
		expect(resource).toMatchObject({ name: 'README.md', textContent: '# llama.cpp' });
	});

	it('leave the built-in kinds as they were', () => {
		expect(isTextFile(TEXT)).toBe(true);
		expect(
			isTextFile({ content: 'old', name: 'pasted', type: AttachmentType.LEGACY_CONTEXT })
		).toBe(true);
		expect(
			isTextFile({
				base64Data: '',
				content: 'page text',
				name: 'doc.pdf',
				processedAsImages: false,
				type: AttachmentType.PDF
			})
		).toBe(false);
		expect(isTextFile({ base64Url: '', name: 'a.png', type: AttachmentType.IMAGE })).toBe(false);
		expect(
			isTextFile({
				base64Data: '',
				mimeType: 'audio/wav',
				name: 'a.wav',
				type: AttachmentType.AUDIO
			})
		).toBe(false);
	});
});
