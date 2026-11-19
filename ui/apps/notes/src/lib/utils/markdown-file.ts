import { MARKDOWN_FILE, NOTE_TITLE_MAX_LENGTH } from '#lib/constants/index.ts';
import type { Note } from '#lib/types/notes.ts';
import { noteTitle } from '#lib/utils/note-title.ts';

const BYTE_ORDER_MARK = '﻿';
// characters no file system takes in a name, and control characters
// eslint-disable-next-line no-control-regex
const UNSAFE_FILE_NAME_CHARACTERS = /[\\/:*?"<>|\u0000-\u001f]/g;

/**
 * A file's text as a note holds it: without a byte-order mark and with `\n` line
 * breaks, which is what the editor gives back after the first edit anyway.
 */
export function noteTextFromFile(text: string): string {
	const withoutMark = text.startsWith(BYTE_ORDER_MARK) ? text.slice(1) : text;

	return withoutMark.replace(/\r\n?/g, '\n');
}

/** Whether a file can be read in as a note: Markdown or any other text. */
export function isOpenableFile(file: { name: string; type: string }): boolean {
	const name = file.name.toLowerCase();

	return (
		file.type.startsWith('text/') ||
		MARKDOWN_FILE.OPENABLE_EXTENSIONS.some((extension) => name.endsWith(extension))
	);
}

/** The name a note is saved under: its file's, or else its title as a Markdown file name. */
export function markdownFileName(note: Pick<Note, 'content' | 'fileName'>): string {
	if (note.fileName) return note.fileName;

	const title = noteTitle(note.content)
		.replace(/\.\.\.$/, '')
		.replace(UNSAFE_FILE_NAME_CHARACTERS, '')
		.replace(/\s+/g, ' ')
		.replace(/[\s.]+$/, '')
		.trim()
		.slice(0, NOTE_TITLE_MAX_LENGTH);

	return `${title || 'Untitled note'}${MARKDOWN_FILE.EXTENSION}`;
}

/** Whether a note has changes its Markdown file does not have yet. */
export function hasUnsavedFileChanges(note: Pick<Note, 'content' | 'fileContent' | 'fileName'>) {
	return note.fileName !== undefined && note.content !== note.fileContent;
}
