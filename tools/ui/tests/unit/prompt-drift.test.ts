import { PromptDrift } from '$lib/enums';
import type { DatabasePrompt } from '$lib/types/database';
import { getPromptDrift } from '$lib/utils/prompt-drift';
import { describe, expect, it } from 'vitest';

function makePrompt(overrides: Partial<DatabasePrompt> = {}): DatabasePrompt {
	return {
		content: 'Answer briefly.',
		id: 'p1',
		lastModified: 2000,
		name: 'Brief',
		...overrides
	};
}

describe('getPromptDrift', () => {
	it('reports missing when there is no prompt', () => {
		expect(getPromptDrift({ content: 'x', timestamp: 1000 }, undefined)).toBe(PromptDrift.MISSING);
	});

	it('reports none when the texts match, ignoring surrounding whitespace', () => {
		const message = { content: '  Answer briefly.\n', timestamp: 1000 };

		expect(getPromptDrift(message, makePrompt())).toBe(PromptDrift.NONE);
	});

	it('reports the library side when the prompt was saved after the message', () => {
		const message = { content: 'Answer at length.', timestamp: 1000 };

		expect(getPromptDrift(message, makePrompt({ lastModified: 2000 }))).toBe(PromptDrift.LIBRARY);
	});

	it('reports the message side when the prompt was saved before the message', () => {
		const message = { content: 'Answer at length.', timestamp: 3000 };

		expect(getPromptDrift(message, makePrompt({ lastModified: 2000 }))).toBe(PromptDrift.MESSAGE);
	});

	it('treats a prompt saved in the same millisecond as the message as the message side', () => {
		const message = { content: 'Answer at length.', timestamp: 2000 };

		expect(getPromptDrift(message, makePrompt({ lastModified: 2000 }))).toBe(PromptDrift.MESSAGE);
	});
});
