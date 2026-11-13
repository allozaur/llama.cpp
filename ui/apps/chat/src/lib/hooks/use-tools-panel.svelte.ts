import { CLI_FLAGS } from '$lib/constants';
import type { ToolProviderEmptyHint } from '$lib/extensions';
import { conversationsStore, toolsStore } from '$lib/stores';
import type { ToolEntry, ToolGroup } from '$lib/types';
import { SvelteSet } from 'svelte/reactivity';

export interface UseToolsPanelReturn {
	readonly expandedGroups: SvelteSet<string>;
	readonly categoryGroups: ToolGroup[];
	readonly providerGroups: ToolGroup[];
	/** What each tool provider says while there is no tool to list. */
	readonly providerHints: ToolProviderEmptyHint[];
	readonly totalToolCount: number;
	readonly noToolsInfoMessage: string | null;
	isGroupChecked(group: ToolGroup): boolean;
	getEnabledToolCount(group: ToolGroup): number;
	getGroupCheckState(group: ToolGroup): { checked: boolean; indeterminate: boolean };
	getFavicon(group: ToolGroup): string | null;
	isGroupDisabled(group: ToolGroup): boolean;
	isToolEnabled(entry: ToolEntry): boolean;
	isToolParentDisabled(entry: ToolEntry): boolean;
	toggleTool(entry: ToolEntry): void;
	toggleGroupExpanded(key: string): void;
	/** Toggle all tools in a group by its stable key (avoids stale group object references). */
	toggleGroupByKey(key: string): void;
	handleOpen(): void;
}

/**
 * Shared reactive state and helpers for the tools panel UI.
 *
 * Used by both the desktop dropdown (`ChatFormActionAddToolsSubmenu`)
 * and the mobile drawer (`ChatFormActionAddDrawer`) to avoid
 * duplicating group filtering, checked-state derivation, and favicon logic.
 *
 * All toggle state routes through `conversationsStore.preferences`: with an
 * active conversation it edits that conversation's tool policy, on the
 * new-chat screen it edits the global defaults seeded into new conversations.
 */
export function useToolsPanel(): UseToolsPanelReturn {
	const expandedGroups = new SvelteSet<string>();
	const groups = $derived(toolsStore.toolGroups);
	// groups without an id are 1:1 with tool categories; a provider's tools group by id
	const categoryGroups = $derived(groups.filter((g) => !g.serverId));
	const providerGroups = $derived(groups.filter((g) => !!g.serverId));
	const providerHints = $derived(
		toolsStore.providers.flatMap((provider) => provider.emptyHint?.() ?? [])
	);
	const totalToolCount = $derived(groups.reduce((n, g) => n + g.tools.length, 0));
	const noToolsInfoMessage = $derived.by(() => {
		if (toolsStore.loading) return null;

		if (toolsStore.toolGroups.length > 0) return null;

		const message = [
			`To enable Server Tools you need to run llama-server with ${CLI_FLAGS.TOOLS} all or ${CLI_FLAGS.TOOLS} <name> flag.`,
			...providerHints.map((hint) => hint.sentence)
		].join(' ');

		// Tools endpoint unreachable (403) — server started without tools
		if (toolsStore.isToolsEndpointUnreachable) return message;

		// Other errors — return null so UI shows "Failed to load tools"
		if (toolsStore.error) return null;

		return message;
	});

	function isGroupChecked(group: ToolGroup): boolean {
		return conversationsStore.preferences.isGroupChecked(group);
	}

	function getEnabledToolCount(group: ToolGroup): number {
		return group.tools.filter((tool) => conversationsStore.preferences.isToolActive(tool)).length;
	}

	/**
	 * Group checkbox state: checked is the parent flag (category on, or the
	 * group key on for a group with an id); indeterminate marks the mixed case where
	 * the parent is on but nothing or only part of the group is enabled.
	 * isToolActive folds the parent gates into the count, so a disabled parent
	 * always yields plain unchecked.
	 */
	function getGroupCheckState(group: ToolGroup): { checked: boolean; indeterminate: boolean } {
		const checked = isGroupChecked(group);
		const enabledCount = getEnabledToolCount(group);
		const indeterminate =
			group.tools.length > 0 && (enabledCount === 0 ? checked : enabledCount < group.tools.length);

		return { checked, indeterminate };
	}

	function getFavicon(group: ToolGroup): string | null {
		return toolsStore.getGroupIcon(group);
	}

	function isGroupDisabled(group: ToolGroup): boolean {
		// a group with an id grays out while its whole category is off
		return !!group.serverId && !conversationsStore.preferences.isCategoryEnabled(group.source);
	}

	function isToolEnabled(entry: ToolEntry): boolean {
		return conversationsStore.preferences.isToolEnabled(entry.key);
	}

	function isToolParentDisabled(entry: ToolEntry): boolean {
		return conversationsStore.preferences.isToolParentDisabled(entry);
	}

	function toggleTool(entry: ToolEntry): void {
		void conversationsStore.preferences.toggleTool(entry.key);
	}

	function toggleGroupExpanded(key: string): void {
		if (expandedGroups.has(key)) {
			expandedGroups.delete(key);
		} else {
			expandedGroups.add(key);
		}
	}

	function toggleGroupByKey(key: string): void {
		// Find current group by key to get up-to-date tool references
		const group = groups.find((g) => g.key === key);

		if (!group) return;

		void conversationsStore.preferences.toggleGroup(group);
	}

	function handleOpen(): void {
		if (toolsStore.serverTools.length === 0 && !toolsStore.loading) {
			toolsStore.fetchServerTools();
		}

		for (const provider of toolsStore.providers) void provider.refresh?.();
	}

	return {
		get categoryGroups() {
			return categoryGroups;
		},
		expandedGroups,
		getEnabledToolCount,
		getFavicon,
		getGroupCheckState,
		handleOpen,
		isGroupChecked,
		isGroupDisabled,
		isToolEnabled,
		isToolParentDisabled,
		get noToolsInfoMessage() {
			return noToolsInfoMessage;
		},
		get providerGroups() {
			return providerGroups;
		},
		get providerHints() {
			return providerHints;
		},
		toggleGroupByKey,
		toggleGroupExpanded,
		toggleTool,
		get totalToolCount() {
			return totalToolCount;
		}
	};
}
