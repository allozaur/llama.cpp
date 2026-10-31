import { PROMPT_CONTENT_SEPARATOR } from '$lib/constants';
import { ContentPartType } from '$lib/enums';
import { mcpStore, promptsStore } from '$lib/stores';
import type { MCPPromptInfo, PromptMessage } from '$lib/types';
import { buildMcpPromptId } from '$lib/utils';
import { SvelteMap } from 'svelte/reactivity';

/** An MCP prompt with the server details its row shows. */
export interface McpPromptEntry {
	prompt: MCPPromptInfo;
	serverLabel: string;
	faviconUrl: string | null;
}

export interface UseSystemMessagePromptsOptions {
	/** A library prompt or an MCP prompt without arguments was chosen; the text becomes the system message. */
	onPromptSelect: (content: string, promptId: string, title: string) => void;
	/** An MCP prompt with arguments was chosen; the caller opens the argument form. */
	onMcpPromptArguments: (prompt: MCPPromptInfo) => void;
}

/**
 * Data and actions behind the System message list, shared by the dropdown
 * submenu and the mobile drawer. MCP prompts load on demand, when the list opens.
 */
export function useSystemMessagePrompts(opts: UseSystemMessagePromptsOptions) {
	let searchQuery = $state('');
	let mcpPrompts = $state<MCPPromptInfo[]>([]);

	const libraryPrompts = $derived(promptsStore.search(searchQuery));
	const mcpEntries = $derived.by<McpPromptEntry[]>(() => {
		const servers = mcpStore.getServers();
		const serverById = new SvelteMap(servers.map((server) => [server.id, server]));
		const entries = mcpPrompts.map((prompt) => {
			const server = serverById.get(prompt.serverName);

			return {
				faviconUrl: server ? mcpStore.getServerFavicon(server.id) : null,
				prompt,
				serverLabel: server ? mcpStore.getServerLabel(server) : prompt.serverName
			};
		});
		const q = searchQuery.trim().toLowerCase();

		if (!q) return entries;

		return entries.filter((entry) => {
			const name = (entry.prompt.title || entry.prompt.name).toLowerCase();
			const description = (entry.prompt.description || '').toLowerCase();

			return (
				name.includes(q) || description.includes(q) || entry.serverLabel.toLowerCase().includes(q)
			);
		});
	});
	/** Whether the list has anything to show, so the search field is worth offering. */
	const hasPrompts = $derived(promptsStore.prompts.length > 0 || mcpPrompts.length > 0);
	/** Whether a search left nothing to show. */
	const hasNoMatches = $derived(
		searchQuery.trim() !== '' && libraryPrompts.length === 0 && mcpEntries.length === 0
	);

	async function loadMcpPrompts(): Promise<void> {
		try {
			const initialized = await mcpStore.ensureInitialized();

			mcpPrompts = initialized ? await mcpStore.getAllPrompts() : [];
		} catch (error) {
			console.error('[useSystemMessagePrompts] Failed to load MCP prompts:', error);
			mcpPrompts = [];
		}
	}

	function selectLibraryPrompt(id: string): void {
		const prompt = promptsStore.get(id);

		if (prompt) opts.onPromptSelect(prompt.content, prompt.id, prompt.name);
	}

	async function selectMcpPrompt(entry: McpPromptEntry): Promise<void> {
		if (entry.prompt.arguments?.length) {
			opts.onMcpPromptArguments(entry.prompt);

			return;
		}

		try {
			const result = await mcpStore.getPrompt(entry.prompt.serverName, entry.prompt.name, {});
			const text = (result?.messages ?? [])
				.map((msg: PromptMessage) => {
					if (typeof msg.content === 'string') return msg.content;

					if (msg.content.type === ContentPartType.TEXT) return msg.content.text;

					return '';
				})
				.filter(Boolean)
				.join(PROMPT_CONTENT_SEPARATOR);

			if (!text) return;

			opts.onPromptSelect(
				text,
				buildMcpPromptId(entry.prompt.serverName, entry.prompt.name),
				entry.prompt.title || entry.prompt.name
			);
		} catch (error) {
			console.error('[useSystemMessagePrompts] Failed to run MCP prompt:', error);
		}
	}

	return {
		get hasNoMatches() {
			return hasNoMatches;
		},
		get hasPrompts() {
			return hasPrompts;
		},
		get libraryPrompts() {
			return libraryPrompts;
		},
		loadMcpPrompts,
		get mcpEntries() {
			return mcpEntries;
		},
		get searchQuery() {
			return searchQuery;
		},
		set searchQuery(value: string) {
			searchQuery = value;
		},
		selectLibraryPrompt,
		selectMcpPrompt
	};
}
