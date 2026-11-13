// The generic extension page route serves whatever page an active extension
// contributes for the path, and ends in the app's 404 for every other path.

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('$app/environment', () => ({ browser: true }));
vi.mock('$lib/stores/init', () => ({ loadAppRoute: vi.fn(async () => {}) }));

import { load } from '../../src/routes/[extensionPage]/+page';
import { extensions } from '$lib/extensions';
import { loadAppRoute } from '$lib/stores/init';
import type { Component } from 'svelte';

const Page = (() => {}) as unknown as Component;

type LoadEvent = Parameters<typeof load>[0];

function loadPath(path: string) {
	return load({ fetch, params: { extensionPage: path } } as unknown as LoadEvent);
}

describe('extension page route', () => {
	beforeEach(() => {
		const data = new Map<string, string>();

		vi.stubGlobal('localStorage', {
			getItem: (key: string) => data.get(key) ?? null,
			setItem: (key: string, value: string) => void data.set(key, value)
		});
	});

	it('is the 404 for a path no extension has a page for, and the page once one has', async () => {
		await expect(loadPath('fake-page')).rejects.toMatchObject({
			body: { message: 'Not Found' },
			status: 404
		});

		extensions.register({
			description: 'A test extension',
			id: 'fake-pages',
			load: async () => ({
				default: {
					activate(ctx) {
						ctx.contribute('pages', { component: Page, path: 'fake-page', title: 'Fake' });
					}
				}
			}),
			name: 'Fake pages'
		});
		await extensions.activateEnabled();

		await expect(loadPath('fake-page')).resolves.toBeUndefined();
		await expect(loadPath('other-page')).rejects.toMatchObject({ status: 404 });
		// the stores start, and the API key is checked, before the path is looked up
		expect(loadAppRoute).toHaveBeenCalledWith(fetch);

		await extensions.setEnabled('fake-pages', false);

		await expect(loadPath('fake-page')).rejects.toMatchObject({ status: 404 });
	});
});
