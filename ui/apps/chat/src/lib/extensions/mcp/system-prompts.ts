/**
 * MCP prompts as system messages: listed in the chat form's System message
 * menu beside the prompt library.
 */

import type { SystemPromptEntry } from '../points/system-prompts';
import type { ExtensionContext } from '../types';
import McpLogo from './components/McpLogo.svelte';
import { MCP_PROMPTS_PICKER_ID } from './composer';
import { pendingPromptArguments } from './prompt-arguments.svelte';
import { mcpStore } from './stores/index.svelte';
import { PROMPT_CONTENT_SEPARATOR } from '$lib/constants';
import { ContentPartType } from '$lib/enums';
import type { MCPPromptInfo, PromptMessage } from '$lib/types';
import { buildMcpPromptId } from '$lib/utils';

export function contributeSystemPrompts(ctx: ExtensionContext): void {
	// the prompts behind the entries handed out, by entry id
	let listed: Record<string, MCPPromptInfo> = {};

	ctx.contribute('systemPromptSources', {
		icon: McpLogo,
		id: 'mcp',
		label: 'MCP Prompts',

		async list(): Promise<SystemPromptEntry[]> {
			const initialized = await mcpStore.ensureInitialized();
			const prompts = initialized ? await mcpStore.getAllPrompts() : [];

			listed = {};

			return prompts.map((prompt) => {
				const server = mcpStore.getServers().find((s) => s.id === prompt.serverName);
				const id = buildMcpPromptId(prompt.serverName, prompt.name);

				listed[id] = prompt;

				return {
					argumentCount: prompt.arguments?.length ?? 0,
					description: prompt.description,
					iconUrl: server ? mcpStore.getServerFavicon(server.id) : null,
					id,
					origin: server ? mcpStore.getServerLabel(server) : prompt.serverName,
					title: prompt.title || prompt.name
				};
			});
		},

		// the existing argument form, in the prompt picker
		openArguments(entry, composer): void {
			const prompt = listed[entry.id];

			if (!prompt) return;

			pendingPromptArguments.set(prompt);
			composer.openPicker(MCP_PROMPTS_PICKER_ID);
		},

		async resolve(entry): Promise<string | null> {
			const prompt = listed[entry.id];

			if (!prompt) return null;

			const result = await mcpStore.getPrompt(prompt.serverName, prompt.name, {});
			const text = (result?.messages ?? [])
				.map((msg: PromptMessage) => {
					if (typeof msg.content === 'string') return msg.content;

					if (msg.content.type === ContentPartType.TEXT) return msg.content.text;

					return '';
				})
				.filter(Boolean)
				.join(PROMPT_CONTENT_SEPARATOR);

			return text || null;
		}
	});

	ctx.onDeactivate(() => pendingPromptArguments.clear());
}
