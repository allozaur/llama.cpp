import type { RouteId } from '$app/types';

/** Query params the chat routes read from the URL. */
export const URL_PARAMS = {
	/** Load the selected model instead of waiting for the first message. */
	LOAD: 'load',
	/** Model to select. */
	MODEL: 'model',
	/** Prompt to send on arrival. */
	QUERY: 'q'
} as const;

/**
 * Route ids of the app's pages, as `page.route.id` reports them. Navigate with
 * `resolve(ROUTES.MODELS)` from `$app/paths`, which checks the route exists and returns its URL
 * (`#/models` with the hash router); URLs with ids come from RouterService.
 */
export const ROUTES = {
	/** A conversation. */
	CHAT: '/(chat)/chat/[id]',
	/** Models manager. */
	MODELS: '/models',
	/** Search — mobile-only full-page conversation search. */
	SEARCH: '/search',
	/** Settings - a page on a phone, a dialog elsewhere. */
	SETTINGS: '/settings',
	/** Root — start of the app. */
	START: '/(chat)'
} as const satisfies Record<string, RouteId>;
