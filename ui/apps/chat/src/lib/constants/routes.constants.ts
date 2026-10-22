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
	/** A conversation outside any project. */
	CHAT: '/(chat)/chat/[id]',
	/** A page an extension contributes, see RouterService.extensionPage(). */
	EXTENSION_PAGE: '/[extensionPage]',
	/** Library. */
	LIBRARY: '/library',
	/** Models manager. */
	MODELS: '/models',
	/** A project's overview. */
	PROJECT: '/(chat)/projects/[projectId]',
	/** A chat opened inside its project. */
	PROJECT_CHAT: '/(chat)/projects/[projectId]/chat/[id]',
	/** The new-chat screen of a project. */
	PROJECT_NEW_CHAT: '/(chat)/projects/[projectId]/chat/new',
	/** Projects list. */
	PROJECTS: '/projects',
	/** Search — mobile-only full-page conversation search. */
	SEARCH: '/search',
	/** Servers - a page on a phone, a dialog elsewhere. */
	SERVERS: '/servers',
	/** Settings - a page on a phone, a dialog elsewhere. */
	SETTINGS: '/settings',
	/** Root — start of the app. */
	START: '/(chat)'
} as const satisfies Record<string, RouteId>;
