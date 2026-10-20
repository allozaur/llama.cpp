// Guards the phone's door to servers. The models dialog is desktop-only, so a
// phone reaches its server list from the sidebar; without that entry there is no
// way to pair a server, and a phone with no paired server has nothing to pick a
// model from.

import DialogServersWrapper from './components/DialogServersWrapper.svelte';
import { ChatScreenServerError, SidebarNavigationActions } from '$lib/components/app';
import { CODE_CHARS, CODE_LENGTHS, SETTINGS_KEYS } from '$lib/constants';
import { serversStore, serverStore, settingsStore, uiStore } from '$lib/stores';
import { getAuthHeadersForServer } from '$lib/utils/api-headers';
import { createRemoteServer, createUrlServer } from '$lib/utils/server';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';

const PHONE = { height: 844, width: 390 };
const DESKTOP = { height: 900, width: 1280 };
/** A code of the right length, drawn from the alphabet llama-server generates from. */
const CODE = Array.from(
	{ length: CODE_LENGTHS.SHARE },
	(_, index) => CODE_CHARS[index % CODE_CHARS.length]
).join('');

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

	it('offers the API key of a paired server too', async () => {
		const screen = render(DialogServersWrapper);

		await screen.getByRole('button', { name: 'Add new server' }).click();
		await screen.getByRole('tab', { name: 'Remote server' }).click();

		// a llama-server started with --connect can still guard its API with a key,
		// and the tunnel carries the header through
		await expect.element(screen.getByLabelText(/API key/)).toBeVisible();
	});
});

describe('server credentials', () => {
	afterEach(() => {
		settingsStore.updateConfig(SETTINGS_KEYS.SERVERS, '[]');
	});

	it('keeps the API key of every server it stores', () => {
		serversStore.addServer(createUrlServer('https://example.com', 'u1', 'Office', 'sk-url'));
		serversStore.addRemoteServer(CODE, 'Home', 'r1', 'sk-tunnel');

		// the list a request is built from is the parsed one: a key that does not
		// survive the round trip is a key that never reaches the server
		const stored = serversStore.external;
		const url = stored.find((server) => server.id === 'u1');
		const remote = stored.find((server) => server.id === 'r1');

		expect(url?.apiKey).toBe('sk-url');
		expect(remote?.apiKey).toBe('sk-tunnel');
		expect(getAuthHeadersForServer(remote!).Authorization).toBe('Bearer sk-tunnel');
	});

	it('keeps the code of a remote server', () => {
		serversStore.addRemoteServer(CODE, 'Home', 'r1');

		expect(serversStore.external.find((server) => server.id === 'r1')?.code).toBe(CODE);
		expect(createRemoteServer(CODE, 'r2', 'Office').code).toBe(CODE);
	});
});

describe('a chat with no server at all', () => {
	beforeEach(() => {
		settingsStore.updateConfig(SETTINGS_KEYS.SERVERS, '[]');
		serverStore.error = 'Connection refused';
	});

	afterEach(() => {
		serverStore.error = null;
		uiStore.serversOpen = false;
	});

	it('offers pairing as the way out', async () => {
		const screen = render(ChatScreenServerError);

		await expect.element(screen.getByText('Server unavailable')).toBeVisible();

		await screen.getByRole('button', { name: 'Pair a remote server' }).click();

		expect(uiStore.serversOpen).toBe(true);
	});
});
