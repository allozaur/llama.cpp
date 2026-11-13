import { AttachmentType, FileTypeCategory } from '$lib/enums';
import { getFileTypeCategory, getFileTypeCategoryByExtension } from '$lib/utils';

/**
 * Gets the file type category from an uploaded file, checking both MIME type and extension
 * @param uploadedFile - The uploaded file to check
 * @returns The file type category or null if not recognized
 */
function getUploadedFileCategory(uploadedFile: ChatUploadedFile): FileTypeCategory | null {
	// First try MIME type
	const categoryByMime = getFileTypeCategory(uploadedFile.type);

	if (categoryByMime) {
		return categoryByMime;
	}

	// Fallback to extension (browsers don't always provide correct MIME types)
	return getFileTypeCategoryByExtension(uploadedFile.name);
}

/**
 * Determines if an attachment or uploaded file is a text file
 * @param uploadedFile - Optional uploaded file
 * @param attachment - Optional database attachment
 * @returns true if the file is a text file
 */
export function isTextFile(
	attachment?: DatabaseMessageExtra,
	uploadedFile?: ChatUploadedFile
): boolean {
	if (uploadedFile) {
		const category = getUploadedFileCategory(uploadedFile);

		if (category === FileTypeCategory.TEXT) return true;

		// the same rule as for a stored attachment below, for one not sent yet: a kind of
		// the app's own (not a MIME type) that only an extension draws, carrying text
		return (
			category === null &&
			uploadedFile.type !== '' &&
			!uploadedFile.type.includes('/') &&
			typeof uploadedFile.textContent === 'string'
		);
	}

	if (attachment) {
		if (
			attachment.type === AttachmentType.TEXT ||
			attachment.type === AttachmentType.LEGACY_CONTEXT
		) {
			return true;
		}

		// a kind only an extension draws reads as a text file while nothing claims it, when it carries text
		return (
			attachment.type !== AttachmentType.PDF &&
			'content' in attachment &&
			typeof attachment.content === 'string'
		);
	}

	return false;
}

/**
 * Determines if an attachment or uploaded file is an image
 * @param uploadedFile - Optional uploaded file
 * @param attachment - Optional database attachment
 * @returns true if the file is an image
 */
export function isImageFile(
	attachment?: DatabaseMessageExtra,
	uploadedFile?: ChatUploadedFile
): boolean {
	if (uploadedFile) {
		return getUploadedFileCategory(uploadedFile) === FileTypeCategory.IMAGE;
	}

	if (attachment) {
		return attachment.type === AttachmentType.IMAGE;
	}

	return false;
}

/**
 * Determines if an attachment or uploaded file is a PDF
 * @param uploadedFile - Optional uploaded file
 * @param attachment - Optional database attachment
 * @returns true if the file is a PDF
 */
export function isPdfFile(
	attachment?: DatabaseMessageExtra,
	uploadedFile?: ChatUploadedFile
): boolean {
	if (uploadedFile) {
		return getUploadedFileCategory(uploadedFile) === FileTypeCategory.PDF;
	}

	if (attachment) {
		return attachment.type === AttachmentType.PDF;
	}

	return false;
}

/**
 * Determines if an attachment or uploaded file is an audio file
 * @param uploadedFile - Optional uploaded file
 * @param attachment - Optional database attachment
 * @returns true if the file is an audio file
 */
export function isAudioFile(
	attachment?: DatabaseMessageExtra,
	uploadedFile?: ChatUploadedFile
): boolean {
	if (uploadedFile) {
		return getUploadedFileCategory(uploadedFile) === FileTypeCategory.AUDIO;
	}

	if (attachment) {
		return attachment.type === AttachmentType.AUDIO;
	}

	return false;
}

/**
 * Determines if an attachment or uploaded file is a video file
 * @param uploadedFile - Optional uploaded file
 * @param attachment - Optional database attachment
 * @returns true if the file is a video file
 */
export function isVideoFile(
	attachment?: DatabaseMessageExtra,
	uploadedFile?: ChatUploadedFile
): boolean {
	if (uploadedFile) {
		return getUploadedFileCategory(uploadedFile) === FileTypeCategory.VIDEO;
	}

	if (attachment) {
		return attachment.type === AttachmentType.VIDEO;
	}

	return false;
}
