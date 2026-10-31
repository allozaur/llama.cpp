/**
 * The MCP prompt whose argument form the prompt picker should open on next.
 * Set when such a prompt is chosen outside the picker, read by the picker as
 * it opens.
 */

import type { MCPPromptInfo } from '$lib/types';

let pending = $state<MCPPromptInfo | null>(null);

export const pendingPromptArguments = {
	clear(): void {
		pending = null;
	},
	get prompt(): MCPPromptInfo | null {
		return pending;
	},
	set(prompt: MCPPromptInfo): void {
		pending = prompt;
	}
};
