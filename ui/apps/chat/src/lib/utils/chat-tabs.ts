import { NEW_CHAT_TAB_ID, ROUTES } from '#lib/constants/index.ts';
import { RouterService } from '#lib/services/router.service.ts';
import { resolve } from '$app/paths';
import type { ResolvedPathname } from '$app/types';

interface TabRoute {
	params: Partial<Record<string, string>>;
	route: { id: string | null };
}

/** Which tabs a route shows and where they lead. */
export interface TabView {
	/** Tab of the current route; null on a page without one. */
	activeId: string | null;
	/** Where to go when the last visible tab closes. */
	fallbackHref: ResolvedPathname;
	hrefFor: (id: string) => ResolvedPathname;
	/** Visible tab ids, in strip order. */
	ids: string[];
}

/**
 * Tab target of the current route: a conversation id or the new-chat
 * screen. Null on routes without tabs.
 */
export function resolveTabTarget(page: TabRoute): string | null {
	if (page.params.id) return page.params.id;

	return page.route.id === '/(chat)' ? NEW_CHAT_TAB_ID : null;
}

/** Tabs of the current route: every open tab, linked to its chat. */
export function resolveTabView(page: TabRoute, openTabs: string[]): TabView {
	return {
		activeId: resolveTabTarget(page),
		fallbackHref: resolve(ROUTES.START),
		hrefFor: (id) => (id === NEW_CHAT_TAB_ID ? resolve(ROUTES.START) : RouterService.chat(id)),
		ids: openTabs
	};
}
