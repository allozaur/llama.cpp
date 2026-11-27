/**
 * What MCP adds to the chat form: the form that asks for an MCP prompt's
 * arguments, the `/skill` command with its picker of the skills servers
 * publish, and the resources attached to the next message. The prompts
 * themselves are listed through the prompt sources point (see `prompts.ts`).
 */

import type { ExtensionContext } from '../types';
import ComposerMcpPromptArguments from './components/contributions/ComposerMcpPromptArguments.svelte';
import ComposerMcpResources from './components/contributions/ComposerMcpResources.svelte';
import ComposerMcpSkills from './components/contributions/ComposerMcpSkills.svelte';
import { MCP_PROMPT_ARGUMENTS_PICKER_ID } from './prompt-arguments.svelte';
import { MCP_SKILLS_PICKER_ID } from './skills/constants';
import { mcpStore } from './stores/index.svelte';
import { skillServersInUse } from './tools';

export function contributeComposer(ctx: ExtensionContext): void {
	// opened where an MCP prompt that takes arguments is picked
	ctx.contribute('composerPickers', {
		component: ComposerMcpPromptArguments,
		id: MCP_PROMPT_ARGUMENTS_PICKER_ID
	});

	ctx.contribute('composerCommands', {
		description: 'Use a skill of an MCP server',
		isEnabled: () => skillServersInUse().length > 0,
		name: 'skill',
		// before the built-in commands
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
