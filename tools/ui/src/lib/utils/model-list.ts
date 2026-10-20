import { ModelModality } from '$lib/enums';
import type { ModelOption } from '$lib/types/models';

/** Model list helpers: search, grouping and windowing of the selector rows. */

export interface ModelItem {
	option: ModelOption;
}

export interface OrgGroup {
	orgName: string | null;
	items: ModelItem[];
}

/** One remote server's section on the remote view. */
export interface ServerGroup {
	serverId: string;
	/** Models the server lists without any search filtering. */
	catalog: number;
	error: string | null;
	/** Rows to render, capped by the display limit. */
	items: ModelItem[];
	loading: boolean;
	/** Rows left after the search filter, before the cap. */
	matched: number;
	name: string;
}

export interface GroupedModelOptions {
	available: OrgGroup[];
	/** Remote servers, one section each. */
	servers: ServerGroup[];
}

function matchesModality(option: ModelOption, term: string): boolean {
	const modalities = option.modalities;

	if (!modalities) return false;

	switch (term) {
		case ModelModality.VISION.toLowerCase():
			return modalities.vision;
		case ModelModality.AUDIO.toLowerCase():
			return modalities.audio;
		case ModelModality.VIDEO.toLowerCase():
			return modalities.video;
		default:
			return false;
	}
}

export function filterModelOptions(options: ModelOption[], searchTerm: string): ModelOption[] {
	const term = searchTerm.trim().toLowerCase();

	if (!term) return options;

	return options.filter(
		(option) =>
			option.model.toLowerCase().includes(term) ||
			option.name?.toLowerCase().includes(term) ||
			option.aliases?.some((alias: string) => alias.toLowerCase().includes(term)) ||
			option.tags?.some((tag: string) => tag.toLowerCase().includes(term)) ||
			matchesModality(option, term)
	);
}

/**
 * Favorite models across every server, in list order: the favorites tab spans
 * all servers, so they come from the full option list.
 */
export function groupFavoriteOptions(
	options: ModelOption[],
	favoriteIds: Set<string>
): ModelItem[] {
	return options.filter((option) => favoriteIds.has(option.model)).map((option) => ({ option }));
}

/**
 * Cut the local groups down to a window of rows, so the caller can grow it as
 * the list scrolls.
 */
export function windowLocalGroups(
	groups: GroupedModelOptions,
	limit: number
): { available: OrgGroup[]; shown: number } {
	let budget = limit;

	const available: OrgGroup[] = [];

	let shown = 0;

	for (const group of groups.available) {
		if (budget <= 0) break;

		const items = group.items.slice(0, budget);

		budget -= items.length;
		shown += items.length;

		if (items.length > 0) available.push({ ...group, items });
	}

	return { available, shown };
}

export function groupModelOptions(filteredOptions: ModelOption[]): GroupedModelOptions {
	const available: OrgGroup[] = [];
	const orgGroups = new Map<string, ModelItem[]>();

	for (const option of filteredOptions) {
		const key = option.parsedId?.orgName ?? '';

		if (!orgGroups.has(key)) orgGroups.set(key, []);

		orgGroups.get(key)!.push({ option });
	}

	for (const [orgName, items] of orgGroups) {
		// The org-less group has no header, so it goes first to not read as part of the org above it
		if (orgName) available.push({ items, orgName });
		else available.unshift({ items, orgName: null });
	}

	return { available, servers: [] };
}

/**
 * Remote servers as sections, one per server, in the given order. Each section
 * keeps at most `limit` rows; `matched` carries the full count so the caller can
 * offer the rest.
 */
export function groupServerOptions(
	options: ModelOption[],
	servers: {
		serverId: string;
		catalog: number;
		error: string | null;
		loading: boolean;
		name: string;
	}[],
	limit = Infinity,
	recentIds: readonly string[] = []
): ServerGroup[] {
	const byServer = new Map<string, ModelItem[]>();
	const rank = new Map<string, number>();

	recentIds.forEach((id, index) => rank.set(id, index));

	const rankOf = (id: string) => rank.get(id) ?? Number.MAX_SAFE_INTEGER;
	// recently used models lead their section, the rest keep the server's order
	const byRecency = (items: ModelItem[]) =>
		rank.size === 0 ? items : [...items].sort((a, b) => rankOf(a.option.id) - rankOf(b.option.id));

	for (const option of options) {
		const serverId = option.serverId ?? '';

		if (!byServer.has(serverId)) byServer.set(serverId, []);

		byServer.get(serverId)!.push({ option });
	}

	return servers.map((server) => {
		const items = byRecency(byServer.get(server.serverId) ?? []);

		return { ...server, items: items.slice(0, limit), matched: items.length };
	});
}
