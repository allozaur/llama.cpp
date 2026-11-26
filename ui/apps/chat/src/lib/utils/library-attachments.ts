import { createBase64DataUrl } from './data-url';
import { base64ToBytes } from '@ggml-org/llama-voice';
import { AttachmentType, MimeTypeApplication, MimeTypeText } from '#lib/enums/index.ts';
import type { DatabaseMessage, DatabaseMessageExtra } from '#lib/types/database.js';

/** A file of a conversation as the Library lists it, with the message it was sent in. */
export interface LibraryAttachment {
	attachment: DatabaseMessageExtra;
	convId: string;
	/** Stable across pages: the message's id and the file's place in it. */
	id: string;
	messageId: string;
	/** When its message was sent. */
	timestamp: number;
}

const FILE_ATTACHMENT_TYPES: readonly AttachmentType[] = [
	AttachmentType.AUDIO,
	AttachmentType.IMAGE,
	AttachmentType.LEGACY_CONTEXT,
	AttachmentType.PDF,
	AttachmentType.TEXT,
	AttachmentType.VIDEO
];

/** Whether an extra is a file: an image, audio clip, video, PDF or text. Prompts and MCP resources are not. */
export function isFileAttachment(extra: DatabaseMessageExtra): boolean {
	return FILE_ATTACHMENT_TYPES.includes(extra.type);
}

/**
 * The files of a message, in the order they were attached. With a query, only
 * the ones whose name holds it, ignoring case.
 */
export function libraryAttachmentsOf(message: DatabaseMessage, query = ''): LibraryAttachment[] {
	const search = query.trim().toLowerCase();

	return (message.extra ?? []).flatMap((attachment, index) =>
		isFileAttachment(attachment) && attachment.name.toLowerCase().includes(search)
			? [
					{
						attachment,
						convId: message.convId,
						id: `${message.id}:${index}`,
						messageId: message.id,
						timestamp: message.timestamp
					}
				]
			: []
	);
}

/** An image to draw for a file: the image itself, or the first page of a PDF sent as images. */
export function attachmentImage(attachment: DatabaseMessageExtra): string | undefined {
	if (attachment.type === AttachmentType.IMAGE) return attachment.base64Url;

	if (attachment.type === AttachmentType.PDF && attachment.processedAsImages) {
		return attachment.images?.[0];
	}

	return undefined;
}

/** The text of a file that has some to show or copy: a text file, or a PDF read as text. */
export function attachmentText(attachment: DatabaseMessageExtra): string | undefined {
	if (
		attachment.type === AttachmentType.TEXT ||
		attachment.type === AttachmentType.LEGACY_CONTEXT
	) {
		return attachment.content;
	}

	return undefined;
}

/** A file's content as a blob to save, or null for an extra that is not a file. */
export function attachmentBlob(attachment: DatabaseMessageExtra): Blob | null {
	switch (attachment.type) {
		case AttachmentType.AUDIO:
		case AttachmentType.VIDEO:
			return new Blob([base64ToBytes(attachment.base64Data)], { type: attachment.mimeType });
		case AttachmentType.IMAGE:
			// stored as a data URL, whose header names the type
			return dataUrlBlob(attachment.base64Url);
		case AttachmentType.LEGACY_CONTEXT:
		case AttachmentType.TEXT:
			return new Blob([attachment.content], { type: MimeTypeText.PLAIN });
		case AttachmentType.PDF:
			return dataUrlBlob(createBase64DataUrl(MimeTypeApplication.PDF, attachment.base64Data));
		default:
			return null;
	}
}

/** Saves a file to the device under its own name. */
export function downloadAttachment(attachment: DatabaseMessageExtra): void {
	const blob = attachmentBlob(attachment);

	if (!blob) return;

	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');

	link.href = url;
	link.download = attachment.name;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	URL.revokeObjectURL(url);
}

const DATA_URL_BASE64_MARKER = ';base64,';
const DATA_URL_PREFIX = 'data:';

function dataUrlBlob(dataUrl: string): Blob | null {
	const marker = dataUrl.indexOf(DATA_URL_BASE64_MARKER);

	if (!dataUrl.startsWith(DATA_URL_PREFIX) || marker < 0) return null;

	return new Blob([base64ToBytes(dataUrl.slice(marker + DATA_URL_BASE64_MARKER.length))], {
		type: dataUrl.slice(DATA_URL_PREFIX.length, marker)
	});
}
