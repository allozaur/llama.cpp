import {
	hasUnsavedFileChanges,
	isOpenableFile,
	markdownFileName,
	noteTextFromFile
} from '#lib/utils/markdown-file.ts';
import { describe, expect, it } from 'vitest';

describe('noteTextFromFile', () => {
	it('drops a byte-order mark and keeps only \\n line breaks', () => {
		expect(noteTextFromFile('﻿# Title\r\nOne\rTwo\n')).toBe('# Title\nOne\nTwo\n');
	});

	it('leaves plain text as it is', () => {
		expect(noteTextFromFile('Once upon a time')).toBe('Once upon a time');
	});
});

describe('isOpenableFile', () => {
	it('takes Markdown and text files', () => {
		expect(isOpenableFile({ name: 'notes.MD', type: '' })).toBe(true);
		expect(isOpenableFile({ name: 'notes.markdown', type: '' })).toBe(true);
		expect(isOpenableFile({ name: 'draft', type: 'text/plain' })).toBe(true);
	});

	it('turns down other files', () => {
		expect(isOpenableFile({ name: 'photo.png', type: 'image/png' })).toBe(false);
	});
});

describe('markdownFileName', () => {
	it('keeps the name of the file the note came from', () => {
		expect(markdownFileName({ content: '# Other', fileName: 'story.md' })).toBe('story.md');
	});

	it('names a new file after the title, without characters a file name cannot hold', () => {
		expect(markdownFileName({ content: '## A tale: part 1/2?\nOnce' })).toBe('A tale part 12.md');
	});

	it('names an untitled note', () => {
		expect(markdownFileName({ content: '' })).toBe('Untitled note.md');
	});
});

describe('hasUnsavedFileChanges', () => {
	it('is about notes with a file only', () => {
		expect(hasUnsavedFileChanges({ content: 'a' })).toBe(false);
		expect(hasUnsavedFileChanges({ content: 'a', fileContent: 'a', fileName: 'a.md' })).toBe(false);
		expect(hasUnsavedFileChanges({ content: 'ab', fileContent: 'a', fileName: 'a.md' })).toBe(true);
	});
});
