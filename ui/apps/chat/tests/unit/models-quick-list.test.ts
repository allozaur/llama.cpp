import type { ModelOption } from '#lib/types/models.js';
import { pickQuickModels } from '#lib/utils/index.ts';
import { describe, expect, it } from 'vitest';

const option = (id: string) => ({ id, model: id, name: id }) as ModelOption;
const options = ['a', 'b', 'c', 'd', 'e'].map(option);
const ids = (items: { option: ModelOption }[]) => items.map((item) => item.option.id);

describe('pickQuickModels', () => {
	it('lists loaded, then favorite, then recent models, each once', () => {
		expect(
			ids(
				pickQuickModels({
					favoriteIds: new Set(['d', 'b']),
					limit: 6,
					loadedIds: new Set(['b']),
					options,
					recentIds: ['e', 'b', 'missing']
				})
			)
		).toEqual(['b', 'd', 'e']);
	});

	it('stops at the limit', () => {
		expect(
			ids(
				pickQuickModels({
					favoriteIds: new Set(),
					limit: 2,
					loadedIds: new Set(),
					options,
					recentIds: ['c', 'a', 'b']
				})
			)
		).toEqual(['c', 'a']);
	});
});
