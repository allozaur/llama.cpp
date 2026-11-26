// The Library lists the files of conversations: which extras count as files, how a
// message's files are listed and searched, and what a file gives to draw, copy and save.

import { AttachmentType, MessageRole, MessageType } from '#lib/enums/index.ts';
import type { DatabaseMessage, DatabaseMessageExtra } from '#lib/types/database.js';
import {
	attachmentBlob,
	attachmentImage,
	attachmentText,
	isFileAttachment,
	libraryAttachmentsOf
} from '#lib/utils/library-attachments.ts';
import { describe, expect, it } from 'vitest';

// "hello" in base64
const HELLO = 'aGVsbG8=';
const IMAGE: DatabaseMessageExtra = {
	base64Url: `data:image/png;base64,${HELLO}`,
	name: 'Map.png',
	type: AttachmentType.IMAGE
};
const TEXT: DatabaseMessageExtra = {
	content: 'first line\nsecond line',
	name: 'notes.txt',
	type: AttachmentType.TEXT
};
const AUDIO: DatabaseMessageExtra = {
	base64Data: HELLO,
	mimeType: 'audio/wav',
	name: 'voice-1.wav',
	type: AttachmentType.AUDIO
};
const PDF_AS_IMAGES: DatabaseMessageExtra = {
	base64Data: HELLO,
	content: '',
	images: ['data:image/png;base64,cGFnZTE=', 'data:image/png;base64,cGFnZTI='],
	name: 'paper.pdf',
	processedAsImages: true,
	type: AttachmentType.PDF
};
const PROMPT: DatabaseMessageExtra = {
	content: 'Review this change.',
	name: 'Review',
	promptId: 'p1',
	type: AttachmentType.PROMPT
};
const MCP_RESOURCE: DatabaseMessageExtra = {
	content: '# Readme',
	name: 'README.md',
	serverName: 'github',
	type: AttachmentType.MCP_RESOURCE,
	uri: 'repo://readme'
};

function message(extra: DatabaseMessageExtra[] | undefined): DatabaseMessage {
	return {
		children: [],
		content: '',
		convId: 'c1',
		extra,
		id: 'm1',
		parent: null,
		role: MessageRole.USER,
		timestamp: 1000,
		type: MessageType.TEXT
	} as DatabaseMessage;
}

describe('the files of a message', () => {
	it('counts images, audio, video, PDFs and text as files, not prompts or MCP resources', () => {
		expect([IMAGE, TEXT, AUDIO, PDF_AS_IMAGES].every(isFileAttachment)).toBe(true);
		expect([PROMPT, MCP_RESOURCE].some(isFileAttachment)).toBe(false);
	});

	it('lists them in the order they were attached, each with its message', () => {
		expect(libraryAttachmentsOf(message([IMAGE, PROMPT, TEXT]))).toEqual([
			{ attachment: IMAGE, convId: 'c1', id: 'm1:0', messageId: 'm1', timestamp: 1000 },
			{ attachment: TEXT, convId: 'c1', id: 'm1:2', messageId: 'm1', timestamp: 1000 }
		]);
	});

	it('lists nothing for a message without files', () => {
		expect(libraryAttachmentsOf(message(undefined))).toEqual([]);
		expect(libraryAttachmentsOf(message([PROMPT]))).toEqual([]);
	});

	it('keeps only the files whose name holds the query, ignoring case', () => {
		const files = libraryAttachmentsOf(message([IMAGE, TEXT, AUDIO]), ' MAP ');

		expect(files.map((file) => file.attachment.name)).toEqual(['Map.png']);
	});
});

describe('what a file gives', () => {
	it('draws an image as itself, and a PDF sent as images as its first page', () => {
		expect(attachmentImage(IMAGE)).toBe(`data:image/png;base64,${HELLO}`);
		expect(attachmentImage(PDF_AS_IMAGES)).toBe('data:image/png;base64,cGFnZTE=');
		expect(attachmentImage(TEXT)).toBeUndefined();
		expect(attachmentImage(AUDIO)).toBeUndefined();
	});

	it('has text to show and copy only when it is a text file', () => {
		expect(attachmentText(TEXT)).toBe('first line\nsecond line');
		expect(attachmentText(IMAGE)).toBeUndefined();
	});

	it('saves as a blob of its own type', async () => {
		const image = attachmentBlob(IMAGE);
		const audio = attachmentBlob(AUDIO);
		const text = attachmentBlob(TEXT);
		const pdf = attachmentBlob(PDF_AS_IMAGES);

		expect(image?.type).toBe('image/png');
		expect(await image?.text()).toBe('hello');
		expect(audio?.type).toBe('audio/wav');
		expect(await audio?.text()).toBe('hello');
		expect(text?.type).toBe('text/plain');
		expect(await text?.text()).toBe('first line\nsecond line');
		expect(pdf?.type).toBe('application/pdf');
	});

	it('has nothing to save for an extra that is not a file, or an image that is not a data URL', () => {
		expect(attachmentBlob(PROMPT)).toBeNull();
		expect(attachmentBlob({ ...IMAGE, base64Url: 'https://example.com/a.png' })).toBeNull();
	});
});
