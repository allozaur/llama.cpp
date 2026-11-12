// The sidebar and the extension page route show what extensions contribute to
// `navigation` and `pages` and know nothing else about them: a contributed item
// sits right after Models, opens its dialog on a desktop and its page
// on a phone, is lit on its page, and is gone, with everything still working,
// once its extension is off.

import '../../src/app.css';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const pageState = vi.hoisted(() => ({
	params: {} as Record<string, string>,
	route: { id: null as string | null },
	url: new URL('http://localhost/#/')
}));

vi.mock('$app/state', () => ({ page: pageState }));
vi.mock('$app/navigation', async (importOriginal) => ({
	...(await importOriginal<typeof import('$app/navigation')>()),
	goto: vi.fn(async () => {}),
	invalidateAll: vi.fn(async () => {})
}));

import ExtensionPage from '../../src/routes/[extensionPage]/+page.svelte';
import ExtensionPageFixture from './components/ExtensionPageFixture.svelte';
import NavigationDialogFixture from './components/NavigationDialogFixture.svelte';
import SidebarNavigationHarness from './components/SidebarNavigationHarness.svelte';
import { Puzzle } from '@lucide/svelte';
import { goto, invalidateAll } from '$app/navigation';
import SidebarNavigationFooter from '$lib/components/app/navigation/SidebarNavigation/SidebarNavigationFooter.svelte';
import {
	APP_NAME,
	EXTENSION_PAGE_ROUTE_ID,
	SIDEBAR_ACTIONS_ITEMS,
	SIDEBAR_FOOTER_ITEMS
} from '$lib/constants';
import { extensions } from '$lib/extensions';
import { uiStore } from '$lib/stores';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';

/** The labels of the sidebar's own items, in order: its top actions and its footer. */
const ACTIONS = SIDEBAR_ACTIONS_ITEMS.map((item) => item.tooltip);
const FOOTER = SIDEBAR_FOOTER_ITEMS.map((item) => item.tooltip);
const FIXTURE_ID = 'navigation-fixture';
const FIXTURE_ROUTE = '#/fixture-page';
const gotoMock = vi.mocked(goto);
const invalidateAllMock = vi.mocked(invalidateAll);

extensions.register({
	description: 'A sidebar item with a dialog, and a page',
	disabledByDefault: true,
	id: FIXTURE_ID,
	load: async () => ({
		default: {
			activate(ctx) {
				ctx.contribute('navigation', {
					dialog: NavigationDialogFixture,
					icon: Puzzle,
					id: 'fixture',
					placement: 'footer',
					route: FIXTURE_ROUTE,
					tooltip: 'Fixture'
				});
				ctx.contribute('pages', {
					component: ExtensionPageFixture,
					path: 'fixture-page',
					title: 'Fixture'
				});
			}
		}
	}),
	name: 'Navigation fixture'
});

function showRoute(id: string | null, params: Record<string, string> = {}) {
	pageState.route.id = id;
	pageState.params = params;
}

/** Labels of the sidebar's rows, in order; its icon-only keys (the logo, a phone's search) have none. */
function rowLabels(container: Element): string[] {
	return [...container.querySelectorAll<HTMLElement>('[data-slot="button"]')]
		.map((row) => row.querySelector('span span')?.textContent?.trim() ?? '')
		.filter((label) => label !== '');
}

function row(container: Element, label: string): HTMLElement {
	const found = [...container.querySelectorAll<HTMLElement>('[data-slot="button"]')].find(
		(el) => el.querySelector('span span')?.textContent?.trim() === label
	);

	if (!found) throw new Error(`no "${label}" row`);

	return found;
}

describe('navigation and pages extension points', () => {
	let wasExpanded: boolean;

	beforeEach(async () => {
		await page.viewport(1280, 900);
		wasExpanded = uiStore.isSidebarExpanded;
		uiStore.isSidebarExpanded = true;
		showRoute(null);
		gotoMock.mockClear();
		invalidateAllMock.mockClear();
	});

	afterEach(async () => {
		await extensions.setEnabled(FIXTURE_ID, false);
		uiStore.isSidebarExpanded = wasExpanded;
	});

	it('leaves the footer to its own items when no extension contributes', async () => {
		const screen = render(SidebarNavigationFooter, {});

		await vi.waitFor(() => expect(rowLabels(screen.container)).toEqual(FOOTER));
	});

	it('shows a contributed item right after Models while its extension is on', async () => {
		const screen = render(SidebarNavigationFooter, {});

		await extensions.setEnabled(FIXTURE_ID, true);
		await vi.waitFor(() =>
			expect(rowLabels(screen.container)).toEqual(['Models', 'Fixture', ...FOOTER.slice(1)])
		);

		await extensions.setEnabled(FIXTURE_ID, false);
		await vi.waitFor(() => expect(rowLabels(screen.container)).toEqual(FOOTER));
	});

	it('lights a contributed item only while its page is the one shown', async () => {
		await extensions.setEnabled(FIXTURE_ID, true);
		showRoute(EXTENSION_PAGE_ROUTE_ID, { extensionPage: 'fixture-page' });

		const onPage = render(SidebarNavigationFooter, {});

		await vi.waitFor(() =>
			expect(row(onPage.container, 'Fixture').className).toContain('selected-row-surface')
		);
		expect(row(onPage.container, 'Settings').className).not.toContain('selected-row-surface');
		onPage.unmount();

		// another extension page, such as a path nothing is contributed for
		showRoute(EXTENSION_PAGE_ROUTE_ID, { extensionPage: 'other-page' });

		const elsewhere = render(SidebarNavigationFooter, {});

		await vi.waitFor(() => expect(rowLabels(elsewhere.container)).toContain('Fixture'));
		expect(row(elsewhere.container, 'Fixture').className).not.toContain('selected-row-surface');
	});

	it('opens the dialog of a contributed item on a desktop, bound both ways', async () => {
		await extensions.setEnabled(FIXTURE_ID, true);

		const screen = render(SidebarNavigationHarness);
		const dialog = () => document.querySelector('[data-testid="navigation-dialog"]');

		await vi.waitFor(() => expect(rowLabels(screen.container)).toContain('Fixture'));
		expect(dialog()).toBeNull();

		row(screen.container, 'Fixture').click();
		await vi.waitFor(() => expect(dialog()).not.toBeNull());
		expect(gotoMock).not.toHaveBeenCalled();

		// the dialog closes itself through the binding, and opens again from the sidebar
		dialog()!.querySelector('button')!.click();
		await vi.waitFor(() => expect(dialog()).toBeNull());

		row(screen.container, 'Fixture').click();
		await vi.waitFor(() => expect(dialog()).not.toBeNull());

		// switched off with its dialog open, the item takes the dialog with it, for good
		await extensions.setEnabled(FIXTURE_ID, false);
		await vi.waitFor(() => expect(dialog()).toBeNull());
		expect(rowLabels(screen.container)).not.toContain('Fixture');

		await extensions.setEnabled(FIXTURE_ID, true);
		await vi.waitFor(() => expect(rowLabels(screen.container)).toContain('Fixture'));
		expect(dialog()).toBeNull();
	});

	it('opens the page of a contributed item on a phone, among the top actions', async () => {
		await page.viewport(390, 844);
		await extensions.setEnabled(FIXTURE_ID, true);

		const screen = render(SidebarNavigationHarness);

		// a phone lists the footer's items with the actions, without Search and Models
		await vi.waitFor(() => expect(rowLabels(screen.container)).toContain('Fixture'));

		const labels = rowLabels(screen.container);

		expect(labels[0]).toBe('New chat');
		expect(labels.at(-1)).toBe('Settings');
		expect(labels).not.toContain('Search');
		expect(labels).not.toContain('Models');

		row(screen.container, 'Fixture').click();
		await vi.waitFor(() => expect(gotoMock).toHaveBeenCalledWith(FIXTURE_ROUTE));
		expect(document.querySelector('[data-testid="navigation-dialog"]')).toBeNull();
	});

	it('renders the sidebar without any extension', async () => {
		const screen = render(SidebarNavigationHarness);

		await vi.waitFor(() => expect(rowLabels(screen.container)).toEqual([...ACTIONS, ...FOOTER]));
	});

	it('renders the page contributed for the path, under its title', async () => {
		await extensions.setEnabled(FIXTURE_ID, true);
		showRoute(EXTENSION_PAGE_ROUTE_ID, { extensionPage: 'fixture-page' });

		const screen = render(ExtensionPage);

		await vi.waitFor(() =>
			expect(screen.container.querySelector('[data-testid="extension-page"]')).not.toBeNull()
		);
		await vi.waitFor(() => expect(document.title).toBe(`Fixture - ${APP_NAME}`));
		expect(invalidateAllMock).not.toHaveBeenCalled();

		// its extension goes off: the page leaves and the load is asked to run again, into the 404
		await extensions.setEnabled(FIXTURE_ID, false);
		await vi.waitFor(() =>
			expect(screen.container.querySelector('[data-testid="extension-page"]')).toBeNull()
		);
		await vi.waitFor(() => expect(invalidateAllMock).toHaveBeenCalled());
	});
});
