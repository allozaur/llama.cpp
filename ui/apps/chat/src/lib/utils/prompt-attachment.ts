import { uuid } from './uuid';
import {
	AttachmentType,
	FileExtensionText,
	MimeTypeText,
	SpecialFileType
} from '#lib/enums/index.ts';
import type {
	DatabaseMessageExtraPrompt,
	DatabasePrompt,
	PromptLink
} from '#lib/types/database.js';
import type { ChatAttachmentDisplayItem, ChatUploadedFile } from '#lib/types/index.ts';

/** A library prompt as an attachment of the chat form: a chip that holds its text until the message is sent. */
export function promptToUploadedFile(
	prompt: Pick<DatabasePrompt, 'content' | 'id' | 'name'>
): ChatUploadedFile {
	return {
		file: new File([prompt.content], `${prompt.name}${FileExtensionText.TXT}`, {
			type: MimeTypeText.PLAIN
		}),
		id: uuid(),
		name: prompt.name,
		promptId: prompt.id,
		size: prompt.content.length,
		textContent: prompt.content,
		type: SpecialFileType.PROMPT
	};
}

/** Whether a display item is a library prompt, pending in the chat form or sent with a message. */
export function isPromptAttachment(item: ChatAttachmentDisplayItem): boolean {
	return (
		item.attachment?.type === AttachmentType.PROMPT ||
		item.uploadedFile?.type === SpecialFileType.PROMPT
	);
}

/** What links a system message to the prompt it is made from: the message holds the text. */
export function promptLinkExtra(prompt: PromptLink): DatabaseMessageExtraPrompt {
	return { name: prompt.name, promptId: prompt.promptId, type: AttachmentType.PROMPT };
}
