// A jump to a message (from a file in the Library to where it was sent) lands on the
// row that shows the message: its own, or the row of the turn it is drawn in.

import { MessageRole, MessageType } from '#lib/enums/index.ts';
import type { DatabaseMessage } from '#lib/types/database.js';
import { findMessageRowId } from '#lib/utils/message-jump.ts';
import { describe, expect, it } from 'vitest';

function message(id: string, role: MessageRole, parent: string | null): DatabaseMessage {
	return {
		children: [],
		content: '',
		convId: 'c1',
		id,
		parent,
		role,
		timestamp: 0,
		type: MessageType.TEXT
	} as DatabaseMessage;
}

// a user message with a file, then an agentic turn: the assistant calls a tool, whose
// result carries an image, and answers
const MESSAGES = [
	message('user', MessageRole.USER, 'root'),
	message('assistant', MessageRole.ASSISTANT, 'user'),
	message('tool', MessageRole.TOOL, 'assistant'),
	message('answer', MessageRole.ASSISTANT, 'tool')
];
// the turn is one row, under its first message
const ROWS = new Set(['user', 'assistant']);
const hasRow = (id: string) => ROWS.has(id);

describe('the row a jump to a message lands on', () => {
	it('is the message own row when it has one', () => {
		expect(findMessageRowId(MESSAGES, 'user', hasRow)).toBe('user');
	});

	it('is the row of the turn for a message drawn inside it', () => {
		expect(findMessageRowId(MESSAGES, 'tool', hasRow)).toBe('assistant');
		expect(findMessageRowId(MESSAGES, 'answer', hasRow)).toBe('assistant');
	});

	it('is none for a message that is not in the open branch', () => {
		expect(findMessageRowId(MESSAGES, 'gone', hasRow)).toBeNull();
	});

	it('is none when no message up to the root has a row', () => {
		expect(findMessageRowId(MESSAGES, 'tool', () => false)).toBeNull();
	});
});
