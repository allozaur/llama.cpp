import config from '../../.storybook/main';
import { STORYBOOK_SECTIONS } from '../stories/introduction/sections';
import { describe, expect, it } from 'vitest';

// the Introduction's Sections figure lists the sidebar's sections and their groups; the sidebar takes its order from
// storySorts in .storybook/main.ts, which the browser never loads, so the figure keeps its own copy

type Order = (string | Order)[];

/** The names at one level of a story sort order, without the nested orders that follow them. */
function sections(order: Order): { name: string; children: Order }[] {
	return order.flatMap((entry, index) => {
		if (typeof entry !== 'string') return [];

		const next = order[index + 1];

		return [{ children: Array.isArray(next) ? next : [], name: entry }];
	});
}

describe("the Introduction's Sections figure", () => {
	it("lists the sidebar's sections and their groups, in sidebar order", () => {
		const [storySort] = config.storySorts as { order: Order }[];
		const sidebar = sections(storySort.order).map(({ children, name }) => ({
			name,
			pages: sections(children).map((child) => child.name)
		}));

		expect(STORYBOOK_SECTIONS.map(({ name, pages }) => ({ name, pages }))).toEqual(sidebar);
	});
});
