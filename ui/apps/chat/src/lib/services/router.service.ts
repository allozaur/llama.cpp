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

	/**
	 * Where a conversation opens: inside its project when it is in one, so a
	 * project chat always has its project's tabs and breadcrumb around it.
	 */
	static conversation(conversation: { id: string; projectId?: string | null }): string {
		return conversation.projectId
			? RouterService.projectChat(conversation.projectId, conversation.id)
			: RouterService.chat(conversation.id);
	}

	/** Route of the page an extension contributes at `path`. */
	static extensionPage(path: string): ResolvedPathname {
		return resolve(ROUTES.EXTENSION_PAGE, { extensionPage: path });
	}

	static project(id: string): string {
		return `${ROUTES.PROJECTS}/${id}`;
	}

	/** A chat opened inside its project, with the project's tabs. */
	static projectChat(projectId: string, id: string): string {
		return `${RouterService.project(projectId)}/chat/${id}`;
	}

	/** The new-chat screen of a project; the chat it starts joins the project. */
	static projectNewChat(projectId: string): string {
		return `${RouterService.project(projectId)}/chat/new`;
	}
}
