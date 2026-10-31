import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('$lib/services/database.service', () => ({
	DatabaseService: {
		createPrompt: vi.fn(),
		deletePrompt: vi.fn(),
		getAllPrompts: vi.fn(),
		updatePrompt: vi.fn()
	}
}));

import { DatabaseService } from '$lib/services/database.service';
import { promptsStore } from '$lib/stores/prompts.svelte';
import type { DatabasePrompt } from '$lib/types/database';

const createMock = vi.mocked(DatabaseService.createPrompt);
const deleteMock = vi.mocked(DatabaseService.deletePrompt);
const updateMock = vi.mocked(DatabaseService.updatePrompt);

function makePrompt(overrides: Partial<DatabasePrompt> = {}): DatabasePrompt {
	return {
		content: 'You are terse.',
		id: 'p1',
		lastModified: 1000,
		name: 'Terse',
		...overrides
	};
}

describe('promptsStore', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		promptsStore.prompts = [];
	});

	describe('add', () => {
		it('trims the fields, stores the row and puts it first', async () => {
			promptsStore.prompts = [makePrompt({ id: 'old' })];
			createMock.mockResolvedValue(undefined as never);

			const created = await promptsStore.add({
				content: '  Answer in French.  ',
				description: '   ',
				name: ' French '
			});

			expect(created).toBeDefined();
			expect(created?.name).toBe('French');
			expect(created?.content).toBe('Answer in French.');
			expect(created?.description).toBeUndefined();
			expect(createMock).toHaveBeenCalledWith(created);
			expect(promptsStore.prompts[0]).toBe(created);
			expect(promptsStore.prompts).toHaveLength(2);
		});

		it('refuses a prompt with an empty name or content', async () => {
			expect(await promptsStore.add({ content: 'x', name: '   ' })).toBeUndefined();
			expect(await promptsStore.add({ content: '   ', name: 'Name' })).toBeUndefined();
			expect(createMock).not.toHaveBeenCalled();
		});

		it('leaves the list alone when the database write fails', async () => {
			vi.spyOn(console, 'error').mockImplementation(() => {});
			createMock.mockRejectedValue(new Error('quota'));

			expect(await promptsStore.add({ content: 'x', name: 'Name' })).toBeUndefined();
			expect(promptsStore.prompts).toHaveLength(0);
		});
	});

	describe('update', () => {
		it('writes the new content, bumps lastModified and keeps the name when empty', async () => {
			promptsStore.prompts = [makePrompt()];
			updateMock.mockResolvedValue(undefined);

			const before = Date.now();

			await promptsStore.update('p1', { content: 'Be brief.', name: '  ' });

			const stored = promptsStore.get('p1');

			expect(stored?.content).toBe('Be brief.');
			expect(stored?.name).toBe('Terse');
			expect(stored?.lastModified).toBeGreaterThanOrEqual(before);
			expect(updateMock).toHaveBeenCalledWith('p1', stored);
		});

		it('ignores an unknown id and an empty content', async () => {
			promptsStore.prompts = [makePrompt()];

			await promptsStore.update('missing', { content: 'x' });
			await promptsStore.update('p1', { content: '   ' });

			expect(updateMock).not.toHaveBeenCalled();
			expect(promptsStore.get('p1')?.content).toBe('You are terse.');
		});
	});

	describe('remove', () => {
		it('drops the prompt from the list after the row is deleted', async () => {
			promptsStore.prompts = [makePrompt(), makePrompt({ id: 'p2' })];
			deleteMock.mockResolvedValue(undefined);

			await promptsStore.remove('p1');

			expect(deleteMock).toHaveBeenCalledWith('p1');
			expect(promptsStore.prompts.map((p) => p.id)).toEqual(['p2']);
		});
	});

	describe('search', () => {
		beforeEach(() => {
			promptsStore.prompts = [
				makePrompt({ content: 'Reply like a pirate.', id: 'a', name: 'Pirate' }),
				makePrompt({ description: 'For code review', id: 'b', name: 'Reviewer' }),
				makePrompt({ content: 'Use metric units.', id: 'c', name: 'Units' })
			];
		});

		it('returns everything for an empty query', () => {
			expect(promptsStore.search('   ')).toHaveLength(3);
		});

		it('matches name, description and content, ignoring case', () => {
			expect(promptsStore.search('PIRATE').map((p) => p.id)).toEqual(['a']);
			expect(promptsStore.search('code review').map((p) => p.id)).toEqual(['b']);
			expect(promptsStore.search('metric').map((p) => p.id)).toEqual(['c']);
		});

		it('returns nothing when no field matches', () => {
			expect(promptsStore.search('zebra')).toEqual([]);
		});
	});
});
