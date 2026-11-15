/**
 * The fetch the OAuth steps a sign-in runs itself use: the callback's token
 * exchange, sign-out's revocation. Through the CORS proxy, like the server's
 * own traffic, when the server is reached through it.
 */

import { MCPService } from '../services/mcp.service';
import type { FetchLike } from '@modelcontextprotocol/client';
import { CORS_PROXY } from '#lib/constants/index.ts';
import { getAuthHeaders } from '#lib/utils/index.ts';

export function mcpOAuthFetch(useProxy: boolean): FetchLike {
	if (!useProxy) return (url, init) => fetch(url, init);

	return (url, init) => {
		const proxied = MCPService.proxiedRequestUrl(url);

		if (!proxied) return fetch(url, init);

		// the proxy forwards only the headers it is told to, under its prefix; llama-server's own key stays as it is
		const headers = new Headers(getAuthHeaders());

		for (const [key, value] of new Headers(init?.headers).entries()) {
			headers.set(`${CORS_PROXY.HEADER_PREFIX}${key}`, value);
		}

		return fetch(proxied, { ...init, headers });
	};
}
