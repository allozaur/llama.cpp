/**
 * The MCP prompt whose arguments the chat form asks for: set where such a prompt
 * is picked, shown by the arguments picker, answered when its form is sent or
 * closed.
 */

import type { ComposerHandle } from '../points/composer';
import type { MCPPromptInfo } from '#lib/types/index.ts';

export const MCP_PROMPT_ARGUMENTS_PICKER_ID = 'mcp-prompt-arguments';

interface PromptArgumentsRequest {
	prompt: MCPPromptInfo;
	answer: (args: Record<string, string> | null) => void;
}

let pending = $state.raw<PromptArgumentsRequest | null>(null);

export const promptArguments = {
	/** Answer the request, with the arguments or with null when the form was closed. Once per request. */
	answer(args: Record<string, string> | null): void {
		const request = pending;

		pending = null;
		request?.answer(args);
	},

	/** Ask for the prompt's arguments in the chat form. Null when the user gave up. */
	ask(prompt: MCPPromptInfo, composer: ComposerHandle): Promise<Record<string, string> | null> {
		// a request still open gives way to the new one
		this.answer(null);

		return new Promise((resolve) => {
			pending = { answer: resolve, prompt };
			composer.openPicker(MCP_PROMPT_ARGUMENTS_PICKER_ID);
		});
	},

	get prompt(): MCPPromptInfo | null {
		return pending?.prompt ?? null;
	}
};
