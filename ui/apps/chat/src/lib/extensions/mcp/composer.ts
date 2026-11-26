/**
 * What MCP adds to the chat form: the form that asks for an MCP prompt's
 * arguments, and the resources attached to the next message, a skill picked
 * in `/skill` among them. The prompts and the skills themselves are listed
 * through their sources points (see `prompts.ts` and `skills/source.ts`).
 */

import type { ExtensionContext } from '../types';
import ComposerMcpPromptArguments from './components/contributions/ComposerMcpPromptArguments.svelte';
import ComposerMcpResources from './components/contributions/ComposerMcpResources.svelte';
import { MCP_PROMPT_ARGUMENTS_PICKER_ID } from './prompt-arguments.svelte';
import { mcpStore } from './stores/index.svelte';

export function contributeComposer(ctx: ExtensionContext): void {
	// opened where an MCP prompt that takes arguments is picked
	ctx.contribute('composerPickers', {
		component: ComposerMcpPromptArguments,
		id: MCP_PROMPT_ARGUMENTS_PICKER_ID
	});

	ctx.contribute('composerAttachments', {
		component: ComposerMcpResources,
		consume: () => mcpStore.consumeResourceAttachmentsAsExtras(),
		hasPending: () => mcpStore.resources.hasAttachments
	});

	// resources still attached would come back, unseen until then, when MCP is switched on again
	ctx.onDeactivate(() => mcpStore.clearResourceAttachments());
}
