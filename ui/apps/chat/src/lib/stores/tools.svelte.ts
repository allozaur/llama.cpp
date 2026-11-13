/**
 * toolsStore - Tool registry and enablement
 *
 * Owns the server tool listing (with working-directory resolution), built-in
 * browser tools, the tools extensions provide and per-tool enablement,
 * exposed as a unified tool set for the LLM and the tools UI. Consumed by
 * the agentic loop and the chat flows.
 */

import { browser } from '$app/environment';
import {
	buildBrowserInfoToolDefinition,
	buildGetDatetimeToolDefinition,
	buildProjectToolDefinitions,
	buildReadMediaToolDefinition,
	DISABLED_TOOL_CATEGORIES_LOCALSTORAGE_KEY,
	DISABLED_TOOL_KEYS_LOCALSTORAGE_KEY,
	HOME_TILDE,
	TOOL_GROUP_LABELS,
	TOOL_SERVER_LABELS
} from '$lib/constants';
import { BuiltInTool, GlobSearchType, ToolSource } from '$lib/enums';
import { extensions, type ToolGroupIdentityProps, type ToolProvider } from '$lib/extensions';
import { PreferencesService } from '$lib/services/preferences.service';
import { ToolsService } from '$lib/services/tools.service';
import { modelsStore } from '$lib/stores/models/index.svelte';
import { projectsStore } from '$lib/stores/projects.svelte';
import { serverStore } from '$lib/stores/server.svelte';
// direct imports between stores, not via the barrel, to avoid circular deps
import { serversStore } from '$lib/stores/servers.svelte';
import { settingsStore } from '$lib/stores/settings/index.svelte';
import type { OpenAIToolDefinition, ToolEntry, ToolGroup } from '$lib/types';
import { ApiError, buildSandboxToolDefinition } from '$lib/utils';
import type { Component } from 'svelte';
import { SvelteMap, SvelteSet } from 'svelte/reactivity';

/** Stable selection identity for a tool, shared by the disabled set and the permission store */

class ToolsStore {
	// default disabled tool categories, seeded into newly created conversations;
	// the per-conversation policy lives on the conversation row
	private _disabledToolCategories = $state(new SvelteSet<ToolSource>());
	private _disabledTools = $state(new SvelteSet<string>());
	private _error = $state<string | null>(null);
	private _loading = $state(false);
	private _serverHome = $state<string | null | undefined>(undefined);
	private _serverTools = $state<OpenAIToolDefinition[]>([]);
	private _toolsEndpointUnreachable = $state(false);
	// server tools that resolve their paths against the working directory,
	// as declared by the server in its `/tools` listing
	private cwdAwareTools = $state(new SvelteSet<string>());

	get allToolDefinitions(): OpenAIToolDefinition[] {
		return this.allTools.map((t) => t.definition);
	}

	/** Canonical flat list of tool entries with source metadata and stable keys, deduped by key */
	get allTools(): ToolEntry[] {
		const entries: ToolEntry[] = [];
		const seen = new SvelteSet<string>();
		const push = (entry: ToolEntry) => {
			if (seen.has(entry.key)) return;

			seen.add(entry.key);
			entries.push(entry);
		};

		for (const def of this._serverTools) {
			const name = def.function.name;

			push({
				definition: def,
				key: this.getToolKey(ToolSource.SERVER, name),
				source: ToolSource.SERVER
			});
		}

		for (const def of this.browserTools) {
			const name = def.function.name;

			push({
				definition: def,
				key: this.getToolKey(ToolSource.BROWSER, name),
				source: ToolSource.BROWSER
			});
		}

		for (const provider of this.providers) {
			for (const { definition, groupId, groupLabel } of provider.entries()) {
				const name = definition.function.name;

				push({
					definition,
					key: this.getToolKey(provider.source, name, groupId),
					serverId: groupId,
					serverName: groupLabel,
					source: provider.source
				});
			}
		}

		for (const def of this.customTools) {
			const name = def.function.name;

			push({
				definition: def,
				key: this.getToolKey(ToolSource.CUSTOM, name),
				source: ToolSource.CUSTOM
			});
		}

		return entries;
	}

	get browserTools(): OpenAIToolDefinition[] {
		const tools: OpenAIToolDefinition[] = [
			buildGetDatetimeToolDefinition(),
			buildSandboxToolDefinition(!!settingsStore.config.symbolicMathEnabled)
		];
		const readMedia = this.readMediaTool();

		if (readMedia) tools.push(readMedia);

		// the project tools only make sense once there is a project to read or edit
		if (projectsStore.projects.length > 0) tools.push(...buildProjectToolDefinitions());

		// provide browser's get_info tool if server doesn't provide one
		if (!this.hasServerTool(BuiltInTool.SERVER_GET_INFO)) {
			tools.push(buildBrowserInfoToolDefinition());
		}

		return tools;
	}

	get customTools(): OpenAIToolDefinition[] {
		const raw = settingsStore.config.customJson;

		if (!raw || typeof raw !== 'string') return [];

		try {
			const parsed = JSON.parse(raw);

			if (!Array.isArray(parsed)) return [];

			return parsed.filter(
				(t: unknown): t is OpenAIToolDefinition =>
					typeof t === 'object' &&
					t !== null &&
					'type' in t &&
					(t as OpenAIToolDefinition).type === 'function' &&
					'function' in t &&
					typeof (t as OpenAIToolDefinition).function?.name === 'string'
			);
		} catch {
			return [];
		}
	}

	get disabledToolCategories(): ReadonlySet<ToolSource> {
		return this._disabledToolCategories;
	}

	get disabledTools(): SvelteSet<string> {
		return this._disabledTools;
	}

	get error(): string | null {
		return this._error;
	}

	get isToolsEndpointUnreachable(): boolean {
		return this._toolsEndpointUnreachable;
	}

	get loading(): boolean {
		return this._loading;
	}

	/** The tool providers of the active extensions. */
	get providers(): ToolProvider[] {
		return extensions.contributions('tools');
	}

	get serverHome(): string | null {
		return this._serverHome ?? null;
	}

	get serverTools(): OpenAIToolDefinition[] {
		return this._serverTools;
	}

	/** Tools grouped by category for tree display, derived from the canonical entries */
	get toolGroups(): ToolGroup[] {
		const groups: ToolGroup[] = [];
		const byKey = new SvelteMap<string, ToolGroup>();

		for (const entry of this.allTools) {
			const groupKey = entry.serverId
				? this.getGroupKey(entry.source, entry.serverId)
				: entry.source;

			let group = byKey.get(groupKey);

			if (!group) {
				group = {
					key: groupKey,
					label: this.groupLabel(entry),
					serverId: entry.serverId,
					source: entry.source,
					tools: []
				};
				byKey.set(groupKey, group);
				groups.push(group);
			}

			group.tools.push(entry);
		}

		return groups;
	}

	/** Enable several tools or tool groups by key, in one write */
	enableTools(keys: string[]): void {
		for (const key of keys) this._disabledTools.delete(key);

		this.persistDisabledTools();
	}

	async fetchServerTools(): Promise<void> {
		// the /tools endpoint only exists on the local llama.cpp server, so the
		// list follows the built-in server rather than the selected model
		if (!serverStore.hasLocalServer || !serversStore.local.enabled) {
			this._serverTools = [];
			this.cwdAwareTools = new SvelteSet();

			return;
		}

		if (this._loading) return;

		this._loading = true;
		this._error = null;
		this._toolsEndpointUnreachable = false;

		try {
			const toolInfos = await ToolsService.list();

			this._serverTools = toolInfos.map((info) => info.definition);
			this.cwdAwareTools = new SvelteSet(
				toolInfos.filter((info) => info.uses_cwd).map((info) => info.tool)
			);
		} catch (err) {
			this._error = err instanceof Error ? err.message : String(err);

			// 403 from /tools means the server was started without --tools
			if (err instanceof ApiError && err.status === 403) {
				this._toolsEndpointUnreachable = true;
				console.info('[ToolsStore] Server tools are disabled on the server');
			} else {
				console.error('[ToolsStore] Failed to fetch server tools:', err);
			}
		} finally {
			this._loading = false;
		}
	}

	/**
	 * Enabled tool definitions for sending to the LLM. Callers pass an
	 * explicit policy (the active conversation's, resolved with global
	 * defaults when absent); without arguments the store defaults apply.
	 * The order is server, browser/sandbox, extension tools, custom JSON.
	 * The API identifies tools by name, so a name is sent at most once.
	 */
	getEnabledToolsForLLM(
		disabledTools: ReadonlySet<string> = this._disabledTools,
		disabledCategories: ReadonlySet<ToolSource> = this._disabledToolCategories
	): OpenAIToolDefinition[] {
		const enabledNames = new SvelteSet<string>();

		for (const entry of this.allTools) {
			if (this.isEntryEnabled(entry, disabledTools, disabledCategories)) {
				enabledNames.add(entry.definition.function.name);
			}
		}

		const result: OpenAIToolDefinition[] = [];
		const seen = new SvelteSet<string>();
		const take = (def: OpenAIToolDefinition) => {
			const name = def.function.name;

			if (!enabledNames.has(name) || seen.has(name)) return;

			seen.add(name);
			result.push(def);
		};

		for (const def of this._serverTools) take(def);
		for (const def of this.browserTools) take(def);

		for (const provider of this.providers) {
			for (const entry of provider.entries()) take(entry.definition);
		}

		for (const def of this.customTools) take(def);

		return result;
	}

	/** Icon URL of a tool group, when its provider has one */
	getGroupIcon(group: ToolGroup): string | null {
		if (!group.serverId) return null;

		return this.providerFor(group.source)?.groupIcon?.(group.serverId) ?? null;
	}

	/** The component a provider draws a group's name with, null for the plain label */
	getGroupIdentity(group: ToolGroup): Component<ToolGroupIdentityProps> | null {
		if (!group.serverId) return null;

		return this.providerFor(group.source)?.groupIdentity ?? null;
	}

	/**
	 * Group-scoped tool key: disabling it disables all of that group's tools.
	 * The keys are persisted, so the format must not change.
	 */
	getGroupKey(source: ToolSource, groupId: string): string {
		return `${source}:${groupId}`;
	}

	/** Permission key for a tool name, identical to the selection key */
	getPermissionKey(toolName: string): string | null {
		return this.findEntryByName(toolName)?.key ?? null;
	}

	/** Icon URL for a call of a tool, from the first provider that has one for it */
	getToolIcon(toolName: string | undefined): string | null {
		if (!toolName) return null;

		for (const provider of this.providers) {
			const icon = provider.toolIcon?.(toolName);

			if (icon) return icon;
		}

		return null;
	}

	/**
	 * Stable selection identity of a tool: `<source>:<name>`, or
	 * `<source>-<groupId>:<name>` for a tool listed under a group. The keys
	 * are persisted, so the format must not change.
	 */
	getToolKey(source: ToolSource, name: string, groupId?: string): string {
		return groupId ? `${source}-${groupId}:${name}` : `${source}:${name}`;
	}

	/** Get the display label for the server that owns a given tool */
	getToolServerLabel(toolName: string): string {
		const entry = this.findEntryByName(toolName);

		if (!entry) return '';

		if (entry.serverName) return entry.serverName;

		if (entry.source === ToolSource.SERVER) return TOOL_SERVER_LABELS[ToolSource.SERVER];

		if (entry.source === ToolSource.CUSTOM) return TOOL_SERVER_LABELS[ToolSource.CUSTOM];

		if (entry.source === ToolSource.BROWSER) return TOOL_SERVER_LABELS[ToolSource.BROWSER];

		return '';
	}

	/** Determine the source of a tool by its name */
	getToolSource(toolName: string): ToolSource | null {
		return this.findEntryByName(toolName)?.source ?? null;
	}

	/**
	 * Check if a working directory is worth setting: at least one server tool
	 * that reads it is both served and left enabled by the given policy
	 * (defaults to the global defaults).
	 */
	hasEnabledCwdTools(
		disabledTools: ReadonlySet<string> = this._disabledTools,
		disabledCategories: ReadonlySet<ToolSource> = this._disabledToolCategories
	): boolean {
		if (disabledCategories.has(ToolSource.SERVER)) return false;

		return this._serverTools.some((def) => {
			const name = def.function.name;

			return (
				this.cwdAwareTools.has(name) && !disabledTools.has(this.getToolKey(ToolSource.SERVER, name))
			);
		});
	}

	/**
	 * Load persisted disabled tools and fetch the builtin tool list.
	 * Called by initStores() after migrations have run.
	 */
	initialize(): void {
		// browser-only init: skip on SSR to avoid localStorage/fetch side effects
		if (!browser) return;

		try {
			const stored = PreferencesService.getItem(DISABLED_TOOL_KEYS_LOCALSTORAGE_KEY);

			if (stored) {
				const parsed = JSON.parse(stored);

				if (Array.isArray(parsed)) {
					for (const key of parsed) {
						if (typeof key === 'string') this._disabledTools.add(key);
					}
				}
			}
		} catch (err) {
			console.error('[ToolsStore] Failed to load disabled tools from localStorage:', err);
		}

		try {
			const stored = PreferencesService.getItem(DISABLED_TOOL_CATEGORIES_LOCALSTORAGE_KEY);

			if (stored) {
				const parsed = JSON.parse(stored);

				if (Array.isArray(parsed)) {
					for (const key of parsed) {
						if (Object.values(ToolSource).includes(key)) {
							this._disabledToolCategories.add(key as ToolSource);
						}
					}
				}
			}
		} catch (err) {
			console.error('[ToolsStore] Failed to load disabled tool categories from localStorage:', err);
		}

		this.fetchServerTools();
	}

	isCategoryEnabled(source: ToolSource): boolean {
		return !this._disabledToolCategories.has(source);
	}

	isEntryEnabled(
		entry: ToolEntry,
		disabledTools: ReadonlySet<string>,
		disabledCategories: ReadonlySet<ToolSource>
	): boolean {
		if (disabledCategories.has(entry.source)) return false;

		if (disabledTools.has(entry.key)) return false;

		if (entry.serverId) {
			return !disabledTools.has(this.getGroupKey(entry.source, entry.serverId));
		}

		return true;
	}

	isToolEnabled(key: string): boolean {
		return !this._disabledTools.has(key);
	}

	/**
	 * Absolute home directory on the server, resolved once per session via
	 * file_glob_search's `base` field (the server expands `~`). Anchors the
	 * directory picker's search scope and the `~` abbreviation of cwd
	 * displays. Returns null when tools are unavailable.
	 */
	async resolveServerHome(): Promise<string | null> {
		if (this._serverHome !== undefined) return this._serverHome;

		try {
			const res = await ToolsService.executeToolRaw(BuiltInTool.SERVER_FILE_GLOB_SEARCH, {
				limit: 1,
				max_depth: 1,
				path: HOME_TILDE,
				type: GlobSearchType.DIR
			});

			this._serverHome = typeof res.base === 'string' ? res.base : null;
		} catch {
			// searches still work via a literal `~`, only `~` abbreviation degrades
			this._serverHome = null;
		}

		return this._serverHome;
	}

	setCategoryEnabled(source: ToolSource, enabled: boolean): void {
		if (enabled) {
			this._disabledToolCategories.delete(source);
		} else {
			this._disabledToolCategories.add(source);
		}

		this.persistDisabledToolCategories();
	}

	setToolEnabled(key: string, enabled: boolean): void {
		if (enabled) {
			this._disabledTools.delete(key);
		} else {
			this._disabledTools.add(key);
		}

		this.persistDisabledTools();
	}

	toggleCategory(source: ToolSource): void {
		this.setCategoryEnabled(source, !this.isCategoryEnabled(source));
	}

	toggleTool(key: string): void {
		this.setToolEnabled(key, !this.isToolEnabled(key));
	}

	/** First canonical entry matching a tool name, runtime tool calls resolve by name */
	private findEntryByName(toolName: string): ToolEntry | null {
		for (const entry of this.allTools) {
			if (entry.definition.function.name === toolName) return entry;
		}

		return null;
	}

	private groupLabel(entry: ToolEntry): string {
		if (entry.serverId) return entry.serverName ?? '';

		switch (entry.source) {
			case ToolSource.CUSTOM:
				return TOOL_GROUP_LABELS[ToolSource.CUSTOM];
			case ToolSource.BROWSER:
				return TOOL_GROUP_LABELS[ToolSource.BROWSER];
			default:
				return TOOL_GROUP_LABELS[ToolSource.SERVER];
		}
	}

	private hasServerTool(name: BuiltInTool): boolean {
		return this._serverTools.some((def) => def.function.name === name);
	}

	private persistDisabledToolCategories(): void {
		try {
			PreferencesService.setItem(
				DISABLED_TOOL_CATEGORIES_LOCALSTORAGE_KEY,
				JSON.stringify([...this._disabledToolCategories])
			);
		} catch {
			// ignore storage errors
		}
	}

	private persistDisabledTools(): void {
		try {
			PreferencesService.setItem(
				DISABLED_TOOL_KEYS_LOCALSTORAGE_KEY,
				JSON.stringify([...this._disabledTools])
			);
		} catch {
			// ignore storage errors
		}
	}

	private providerFor(source: ToolSource): ToolProvider | undefined {
		return this.providers.find((provider) => provider.source === source);
	}

	/**
	 * `read_media` runs in the browser on top of the server's `read_file`, so it
	 * exists only when that tool is served and the active model can perceive the
	 * bytes. The server cannot make this call - it does not know which model the
	 * conversation uses.
	 */
	private readMediaTool(): OpenAIToolDefinition | null {
		if (!this.hasServerTool(BuiltInTool.SERVER_READ_FILE)) return null;

		const model = modelsStore.selectedModelName ?? modelsStore.models[0]?.model ?? '';

		if (!model) return null;

		const vision = modelsStore.props.modelSupportsVision(model);
		const audio = modelsStore.props.modelSupportsAudio(model);

		if (!vision && !audio) return null;

		return buildReadMediaToolDefinition(vision, audio);
	}
}

export const toolsStore = new ToolsStore();
