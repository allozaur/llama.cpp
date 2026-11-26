// A library prompt goes with a message as an attachment that carries its text, and
// links a system message made from it without repeating the text.

import {
	AttachmentType,
	ContentPartType,
	MessageRole,
	MessageType,
	SpecialFileType
} from '#lib/enums/index.ts';
import { ChatService } from '#lib/services/chat.service.ts';
import type { DatabaseMessage, DatabaseMessageExtra } from '#lib/types/index.ts';
import { parseFilesToMessageExtras } from '#lib/utils/convert-files-to-extra.ts';
import {
	isPromptAttachment,
	promptLinkExtra,
	promptToUploadedFile
} from '#lib/utils/prompt-attachment.ts';
import { describe, expect, it } from 'vitest';

const PROMPT = { content: 'Review this change. Be brief.', id: 'p1', name: 'Review' };

function message(role: MessageRole, extra: DatabaseMessageExtra[], content = ''): DatabaseMessage {
	return {
		children: [],
		content,
		convId: 'c1',
		extra,
		id: 'm1',
		parent: null,
		role,
		timestamp: 0,
		type: MessageType.TEXT
	} as DatabaseMessage;
}

describe('a library prompt as an attachment', () => {
	it('is a chip of the chat form that holds the text', () => {
		const file = promptToUploadedFile(PROMPT);

		expect(file).toMatchObject({
			name: 'Review',
			promptId: 'p1',
			size: PROMPT.content.length,
			textContent: PROMPT.content,
			type: SpecialFileType.PROMPT
		});
		expect(
			isPromptAttachment({ id: file.id, isImage: false, name: file.name, uploadedFile: file })
		).toBe(true);
	});

	it('is sent as an extra with the text, and reaches the model under its name', async () => {
		const { extras } = await parseFilesToMessageExtras([promptToUploadedFile(PROMPT)]);

		expect(extras).toEqual([
			{
				content: PROMPT.content,
				name: 'Review',
				promptId: 'p1',
				size: PROMPT.content.length,
				type: AttachmentType.PROMPT
			}
		]);

		const result = await ChatService.convertDbMessageToApiChatMessageData(
			message(MessageRole.USER, extras, 'main.cpp changed')
		);
		const texts = (result.content as { type: string; text?: string }[])
			.filter((part) => part.type === ContentPartType.TEXT)
			.map((part) => part.text);

		expect(texts[0]).toBe('main.cpp changed');
		expect(texts[1]).toContain('--- Prompt: Review ---');
		expect(texts[1]).toContain(PROMPT.content);
	});

	it('links a system message without adding anything to what the model reads', async () => {
		const link = promptLinkExtra({ name: 'Review', promptId: 'p1' });

		expect(link).toEqual({ name: 'Review', promptId: 'p1', type: AttachmentType.PROMPT });

		const result = await ChatService.convertDbMessageToApiChatMessageData(
			message(MessageRole.SYSTEM, [link], PROMPT.content)
		);

		expect(JSON.stringify(result.content)).not.toContain('--- Prompt');
		expect(JSON.stringify(result.content)).toContain(PROMPT.content);
	});
});
