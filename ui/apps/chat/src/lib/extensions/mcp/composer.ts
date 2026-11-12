/**
 * What MCP adds to the chat form: the `/prompt` command with its picker of
 * MCP prompts, and the resources attached to the next message.
 */

import type { ExtensionContext } from '../types';
import ComposerMcpPrompts from './components/contributions/ComposerMcpPrompts.svelte';
import ComposerMcpResources from './components/contributions/ComposerMcpResources.svelte';
import { mcpStore } from './stores/index.svelte';
import { Sparkles } from '@lucide/svelte';
import { ToolSource } from '$lib/enums';
import { conversationsStore } from '$lib/stores';

export const MCP_PROMPTS_PICKER_ID = 'mcp-prompts';

/**
 * Whether a server could offer prompts. Policy-aware, same rule as the agentic
 * flow: MCP category on and at least one globally-enabled server whose group
 * key is not disabled.
 */
export function hasPromptServers(): boolean {
	const prefs = conversationsStore.preferences;

	if (!prefs.isCategoryEnabled(ToolSource.MCP)) return false;

	return mcpStore
		.getServers()
		.some((s) => s.enabled && prefs.isServerToolsEnabled(s.id) && s.url.trim());
}

export function contributeComposer(ctx: ExtensionContext): void {
	ctx.contribute('composerCommands', {
		description: 'Insert an MCP prompt',
		icon: Sparkles,
		isEnabled: hasPromptServers,
		name: 'prompt',
		// first in the list, before the built-in commands
		order: -1,
		run: (composer, args) => composer.openPicker(MCP_PROMPTS_PICKER_ID, args.trim())
	});

	ctx.contribute('composerPickers', {
		component: ComposerMcpPrompts,
		id: MCP_PROMPTS_PICKER_ID
	});

	ctx.contribute('composerAttachments', {
		component: ComposerMcpResources,
		consume: () => mcpStore.consumeResourceAttachmentsAsExtras(),
		hasPending: () => mcpStore.resources.hasAttachments
	});
}
