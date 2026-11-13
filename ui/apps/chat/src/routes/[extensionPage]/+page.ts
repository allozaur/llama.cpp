import type { PageLoad } from './$types';
import { error } from '@sveltejs/kit';
import { extensions } from '$lib/extensions';
import { loadAppRoute, startExtensions } from '$lib/stores/init';

export const load: PageLoad = async ({ fetch, params }) => {
	await loadAppRoute(fetch);
	// the rest of the startup runs after this load, so the extensions are started here
	await startExtensions();

	// a path none of them has a page for is the app's 404
	if (!extensions.contributions('pages').some((page) => page.path === params.extensionPage)) {
		error(404, 'Not Found');
	}
};
