// Guards the phone's door to servers. The models dialog is desktop-only, so a
// phone reaches its server list from the sidebar; without that entry there is no
// way to pair a server, and a phone with no paired server has nothing to pick a
// model from.

import DialogServersWrapper from './components/DialogServersWrapper.svelte';
import { SidebarNavigationActions } from '$lib/components/app';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';

const PHONE = { height: 844, width: 390 };
const DESKTOP = { height: 900, width: 1280 };

describe('servers on a phone', () => {
	const opened: boolean[] = [];

	beforeEach(async () => {
		opened.length = 0;
		await page.viewport(PHONE.width, PHONE.height);
	});

	afterEach(async () => {
		await page.viewport(DESKTOP.width, DESKTOP.height);
	});

	it('offers the servers list in the sidebar', async () => {
		const screen = render(SidebarNavigationActions, {
			class: '',
			isExpandedMode: true,
			isSearchModeActive: false,
			onServersClick: () => opened.push(true),
			searchQuery: ''
		});
		const item = screen.getByRole('button', { name: 'Servers' });

		await expect.element(item).toBeVisible();

		await item.click();

		expect(opened).toEqual([true]);
	});

	it('opens the list as a dialog of its own', async () => {
		const screen = render(DialogServersWrapper);

		await expect.element(screen.getByText('Servers')).toBeVisible();
		await expect.element(screen.getByRole('button', { name: 'Close' })).toBeVisible();
	});

	it('reaches the pairing form through the add control', async () => {
		const screen = render(DialogServersWrapper);

		await screen.getByRole('button', { name: 'Add new server' }).click();

		await expect.element(screen.getByRole('heading', { name: 'Add New Server' })).toBeVisible();

		await screen.getByRole('tab', { name: 'Remote server' }).click();

		await expect.element(screen.getByText('Not paired yet')).toBeVisible();
	});

	it('opens the form as a bottom drawer, and as a dialog on a desktop', async () => {
		const screen = render(DialogServersWrapper);

		await screen.getByRole('button', { name: 'Add new server' }).click();
		await expect.element(screen.getByRole('heading', { name: 'Add New Server' })).toBeVisible();

		const drawer = document.querySelector('[data-slot="drawer-content"]');

		expect(drawer?.getAttribute('data-vaul-drawer-direction')).toBe('bottom');

		await page.viewport(DESKTOP.width, DESKTOP.height);

		expect(document.querySelector('[data-slot="drawer-content"]')).toBeNull();
		await expect.element(screen.getByRole('heading', { name: 'Add New Server' })).toBeVisible();
	});
});
