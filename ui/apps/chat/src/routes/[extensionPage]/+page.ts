import type { PageLoad } from './$types';
import { error } from '@sveltejs/kit';
import { extensions } from '#lib/extensions/index.ts';
import { loadAppRoute } from '#lib/stores/init.ts';

export const load: PageLoad = async ({ fetch, params }) => {
	await loadAppRoute(fetch);

	// the extensions are active by now: a path none of them has a page for is the app's 404.
	// A page whose extension is not available stays a page: whether it is may not be known yet
	const pages = extensions.contributions('pages', { unavailable: true });

	if (!pages.some((page) => page.path === params.extensionPage)) {
		error(404, 'Not Found');
	}
};
