/**
 * RouterService - Builds app route paths
 *
 * Returns chat route strings from a single source of truth (ROUTES). No state.
 */

import { ROUTES } from '$lib/constants';

export class RouterService {
	static chat(id: string): string {
		return `${ROUTES.CHAT}/${id}`;
	}

	/** Route of the page an extension contributes at `path`. */
	static extensionPage(path: string): string {
		return `${ROUTES.START}${path}`;
	}
}
