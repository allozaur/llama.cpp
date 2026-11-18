import { noteTitle } from '#lib/utils/note-title.ts';
import { describe, expect, it } from 'vitest';

describe('noteTitle', () => {
	it('takes the first line with text', () => {
		expect(noteTitle('\n  \nFirst line\nSecond')).toBe('First line');
	});

	it('drops a heading marker', () => {
		expect(noteTitle('## Chapter one\ntext')).toBe('Chapter one');
	});

	it('names an empty note', () => {
		expect(noteTitle('  \n')).toBe('Untitled note');
	});

	it('shortens a long line', () => {
		const title = noteTitle('x'.repeat(200));

		expect(title).toHaveLength(83);
		expect(title.endsWith('...')).toBe(true);
	});
});
