/**
 * MCP servers as a source of prompts: their prompts are listed with the library's
 * in the chat form's prompt picker and in its System message list.
 */

import type { ComposerHandle } from '../points/composer';
import type { PromptEntry } from '../points/prompts';
import type { ExtensionContext } from '../types';
import PromptMcpCard from './components/contributions/PromptMcpCard.svelte';
import McpLogo from './components/McpLogo.svelte';
import {
	addLoadingPrompt,
	failLoadingPrompt,
	fillLoadedPrompt,
	promptText
} from './composer-prompts';
import { promptArguments } from './prompt-arguments.svelte';
import { buildMcpPromptId, isMcpPromptId } from './prompt-ids';
import { mcpStore } from './stores/index.svelte';
import { ToolSource } from '#lib/enums/index.ts';
import { conversationsStore } from '#lib/stores/index.ts';
import type { MCPPromptInfo } from '#lib/types/index.ts';
import { uuid } from '#lib/utils/index.ts';

const MCP_PROMPT_SOURCE_ID = 'mcp';
const MCP_PROMPT_SOURCE_LABEL = 'MCP servers';

/**
 * Whether a server could offer prompts. Policy-aware, same rule as the agentic
 * flow: MCP category on and at least one globally-enabled server whose group
 * key is not disabled.
 */
export function hasPromptServers(): boolean {
	const prefs = conversationsStore.preferences;

	if (!mcpStore.isFeatureEnabled || !prefs.isCategoryEnabled(ToolSource.MCP)) return false;

	return mcpStore
		.getServers()
		.some((s) => s.enabled && prefs.isServerToolsEnabled(s.id) && s.url.trim());
}

/** Add the prompt to the message being written: a chip that loads, then holds its text or the error. */
async function attachPrompt(
	composer: ComposerHandle,
	prompt: MCPPromptInfo,
	args: Record<string, string>
): Promise<void> {
	const placeholderId = uuid();

	addLoadingPrompt(
		composer,
		placeholderId,
		prompt,
		Object.keys(args).length > 0 ? args : undefined
	);

	try {
		fillLoadedPrompt(
			composer,
			placeholderId,
			await mcpStore.getPrompt(prompt.serverName, prompt.name, args)
		);
	} catch (error) {
		failLoadingPrompt(
			composer,
			placeholderId,
			error instanceof Error ? error.message : 'Unknown error executing prompt'
		);
	}
}

export function contributePrompts(ctx: ExtensionContext): void {
	// the prompts behind the entries handed out, by entry id
	let listed: Record<string, MCPPromptInfo> = {};

	/** The arguments of a listed prompt: none to ask for, the ones filled in, or null when the user gave up. */
	function argumentsOf(
		prompt: MCPPromptInfo,
		composer: ComposerHandle
	): Promise<Record<string, string> | null> {
		return prompt.arguments?.length ? promptArguments.ask(prompt, composer) : Promise.resolve({});
	}

	ctx.contribute('promptSources', {
		attach(entry, composer): void {
			const prompt = listed[entry.id];

			if (!prompt) return;

			void argumentsOf(prompt, composer).then((args) => {
				if (args) void attachPrompt(composer, prompt, args);
			});
		},

		card: PromptMcpCard,
		icon: McpLogo,
		id: MCP_PROMPT_SOURCE_ID,
		label: MCP_PROMPT_SOURCE_LABEL,

		async list(): Promise<PromptEntry[]> {
			listed = {};

			if (!hasPromptServers() || !(await mcpStore.ensureInitialized())) return [];

			// in the order of the servers
			const order = new Map(mcpStore.getServers().map((server, index) => [server.id, index]));
			const prompts = (await mcpStore.getAllPrompts()).sort(
				(a, b) =>
					(order.get(a.serverName) ?? Number.MAX_SAFE_INTEGER) -
					(order.get(b.serverName) ?? Number.MAX_SAFE_INTEGER)
			);

			return prompts.map((prompt) => {
				const id = buildMcpPromptId(prompt.serverName, prompt.name);

				listed[id] = prompt;

				return {
					argumentCount: prompt.arguments?.length ?? 0,
					description: prompt.description,
					iconUrl: mcpStore.getServerFavicon(prompt.serverName) ?? undefined,
					id,
					origin: mcpStore.getServerDisplayName(prompt.serverName),
					title: prompt.title || prompt.name
				};
			});
		},

		owns: isMcpPromptId,

		async resolve(entry, composer): Promise<string | null> {
			const prompt = listed[entry.id];

			if (!prompt) return null;

			const args = await argumentsOf(prompt, composer);

			if (!args) return null;

			return promptText(await mcpStore.getPrompt(prompt.serverName, prompt.name, args)) || null;
		}
	});

	ctx.onDeactivate(() => promptArguments.answer(null));
}
