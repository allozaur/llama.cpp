// The sidebar's footer is the app's own items plus what extensions contribute:
// without a contribution it must be whole, and a contribution must land
// right after Models, ahead of the footer's other items.

import { SIDEBAR_FOOTER_ITEMS } from '$lib/constants';
import { SidebarAction } from '$lib/enums';
import type { NavigationItem } from '$lib/extensions';
import { sidebarFooterItems } from '$lib/utils/sidebar-items';
import type { Component } from 'svelte';
import { describe, expect, it } from 'vitest';

const Icon = (() => {}) as unknown as Component;
/** The labels of the footer's own items, in order. */
const OWN = SIDEBAR_FOOTER_ITEMS.map((item) => item.tooltip);

function makeItem(overrides: Partial<NavigationItem> = {}): NavigationItem {
	return {
		icon: Icon,
		id: 'fake',
		placement: 'footer',
		route: '#/fake',
		tooltip: 'Fake',
		...overrides
	};
}

describe('sidebarFooterItems', () => {
	it('is the app own footer when no extension contributes', () => {
		const items = sidebarFooterItems([]);

		expect(items).toEqual(SIDEBAR_FOOTER_ITEMS);
		// Models opens the footer and Settings closes it, whatever sits between them
		expect(items[0].action).toBe(SidebarAction.MANAGE_MODELS);
		expect(items.at(-1)?.action).toBe(SidebarAction.SETTINGS);
	});

	it('places a contributed item right after Models', () => {
		const contributed = makeItem({ keys: ['cmd', 'j'] });
		const items = sidebarFooterItems([contributed]);

		expect(items.map((item) => item.tooltip)).toEqual(['Models', 'Fake', ...OWN.slice(1)]);
		expect(items[1]).toEqual({
			contributed,
			icon: Icon,
			keys: ['cmd', 'j'],
			tooltip: 'Fake'
		});
		// the sidebar opens it as a contributed item, not as one of its own actions
		expect(items[1].action).toBeUndefined();
	});

	it('keeps contributed items in the order they were contributed', () => {
		const items = sidebarFooterItems([
			makeItem({ id: 'a', tooltip: 'A' }),
			makeItem({ id: 'b', tooltip: 'B' })
		]);

		expect(items.map((item) => item.tooltip)).toEqual(['Models', 'A', 'B', ...OWN.slice(1)]);
	});
});
