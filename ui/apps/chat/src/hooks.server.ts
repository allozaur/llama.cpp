import type { Handle } from '@sveltejs/kit/hooks';
import { APP_LANG, APP_LANG_PLACEHOLDER } from '#lib/constants/app.constants.ts';

// app.html is static, so the page's language is filled in as it is rendered (the SPA fallback too)
export const handle: Handle = ({ event, resolve }) =>
	resolve(event, {
		transformPageChunk: ({ html }) => html.replace(APP_LANG_PLACEHOLDER, APP_LANG)
	});
