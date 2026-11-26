/**
 * What MCP adds to the chat form: the `/prompt` command with its picker of
 * MCP prompts, the `/skill` command with its picker of the skills servers
 * publish, and the resources attached to the next message.
 */

import type { ExtensionContext } from '../types';
import ComposerMcpPrompts from './components/contributions/ComposerMcpPrompts.svelte';
import ComposerMcpResources from './components/contributions/ComposerMcpResources.svelte';
import ComposerMcpSkills from './components/contributions/ComposerMcpSkills.svelte';
import { MCP_SKILLS_PICKER_ID } from './skills/constants';
import { mcpStore } from './stores/index.svelte';
import { skillServersInUse } from './tools';
import { ToolSource } from '#lib/enums/index.ts';
import { conversationsStore } from '#lib/stores/index.ts';

export const MCP_PROMPTS_PICKER_ID = 'mcp-prompts';

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

export function contributeComposer(ctx: ExtensionContext): void {
	ctx.contribute('composerCommands', {
		description: 'Insert an MCP prompt',
		isEnabled: hasPromptServers,
		name: 'prompt',
		// first in the list, before the built-in commands
		order: -1,
		run: (composer, args) => composer.openPicker(MCP_PROMPTS_PICKER_ID, args.trim()),
		takesArgument: true
	});

	ctx.contribute('composerPickers', {
		component: ComposerMcpPrompts,
		id: MCP_PROMPTS_PICKER_ID
	});

	ctx.contribute('composerCommands', {
		description: 'Use a skill of an MCP server',
		isEnabled: () => skillServersInUse().length > 0,
		name: 'skill',
		// with /prompt, before the built-in commands
		order: -1,
		run: (composer, args) => composer.openPicker(MCP_SKILLS_PICKER_ID, args.trim()),
		takesArgument: true
	});

	ctx.contribute('composerPickers', {
		component: ComposerMcpSkills,
		id: MCP_SKILLS_PICKER_ID
	});

	ctx.contribute('composerAttachments', {
		component: ComposerMcpResources,
		consume: () => mcpStore.consumeResourceAttachmentsAsExtras(),
		hasPending: () => mcpStore.resources.hasAttachments
	});

	// resources still attached would come back, unseen until then, when MCP is switched on again
	ctx.onDeactivate(() => mcpStore.clearResourceAttachments());
}
