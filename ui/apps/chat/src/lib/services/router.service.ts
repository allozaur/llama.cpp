/**
 * RouterService - Builds app URLs
 *
 * Resolves the route ids in ROUTES with their params into typed URLs (`#/…` with the hash
 * router). No state.
 */

import { ROUTES } from '#lib/constants/index.ts';
import { resolve } from '$app/paths';
import type { ResolvedPathname } from '$app/types';

export class RouterService {
	static chat(id: string): ResolvedPathname {
		return resolve(ROUTES.CHAT, { id });
	}
}
