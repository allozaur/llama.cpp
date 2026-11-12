/**
 * How MCP prompts and resources are drawn in the chat: a message that is only
 * an MCP prompt, and the MCP items of an attachments list.
 */

import type { ExtensionContext } from '../types';
import McpPromptAttachmentRenderer from './McpPromptAttachmentRenderer.svelte';
import McpPromptMessageRenderer from './McpPromptMessageRenderer.svelte';
import McpResourceAttachmentRenderer from './McpResourceAttachmentRenderer.svelte';
import { AttachmentType, MessageRole } from '$lib/enums';
import type { DatabaseMessage } from '$lib/types';
import { isMcpPrompt, isMcpResource } from '$lib/utils';

/** A user message with no text and exactly one extra, an MCP prompt. */
function isMcpPromptMessage(message: DatabaseMessage): boolean {
	if (message.role !== MessageRole.USER) return false;

	if (message.content.trim()) return false;

	if (!message.extra || message.extra.length !== 1) return false;

	return message.extra[0].type === AttachmentType.MCP_PROMPT;
}

/** Contribute MCP's message and attachment renderers. */
export function contributeRenderers(ctx: ExtensionContext): void {
	ctx.contribute('messageRenderers', {
		component: McpPromptMessageRenderer,
		forkable: false,
		match: isMcpPromptMessage
	});

	ctx.contribute('attachmentRenderers', {
		component: McpPromptAttachmentRenderer,
		match: isMcpPrompt
	});

	// the resource renderer opens its own preview dialog
	ctx.contribute('attachmentRenderers', {
		component: McpResourceAttachmentRenderer,
		match: isMcpResource
	});
}
