import type { PageLoad } from './$types';
import { error } from '@sveltejs/kit';
import { extensions } from '#lib/extensions/index.ts';
import { loadAppRoute, startExtensions } from '#lib/stores/init.ts';

export const load: PageLoad = async ({ fetch, params }) => {
	await loadAppRoute(fetch);
	// the rest of the startup runs after this load, so the extensions are started here
	await startExtensions();

	// a path none of them has a page for is the app's 404. A page whose extension is not
	// available stays a page: whether it is may not be known yet
	const pages = extensions.contributions('pages', { unavailable: true });

	if (!pages.some((page) => page.path === params.extensionPage)) {
		error(404, 'Not Found');
	}
};
