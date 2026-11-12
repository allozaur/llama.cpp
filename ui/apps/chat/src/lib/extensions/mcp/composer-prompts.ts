/**
 * An MCP prompt as an attachment of the chat form: a chip that shows the
 * prompt while its content loads, then holds the content or the error.
 */

import type { ComposerHandle } from '../points/composer';
import { INITIAL_FILE_SIZE, PROMPT_CONTENT_SEPARATOR } from '$lib/constants';
import { ContentPartType, FileExtensionText, MimeTypeText, SpecialFileType } from '$lib/enums';
import type { ChatUploadedFile, GetPromptResult, MCPPromptInfo, PromptMessage } from '$lib/types';

/** Close the prompt picker and add the chip of a prompt that loads. */
export function addLoadingPrompt(
	composer: ComposerHandle,
	placeholderId: string,
	promptInfo: MCPPromptInfo,
	args?: Record<string, string>
): void {
	composer.closePicker();

	const placeholder: ChatUploadedFile = {
		file: new File([], 'loading'),
		id: placeholderId,
		isLoading: true,
		mcpPrompt: {
			arguments: args ? { ...args } : undefined,
			promptName: promptInfo.name,
			serverName: promptInfo.serverName
		},
		name: promptInfo.title || promptInfo.name,
		size: INITIAL_FILE_SIZE,
		type: SpecialFileType.MCP_PROMPT
	};

	composer.addUploadedFile(placeholder);
	composer.focusInput();
}

/** Put the text of the loaded prompt into its chip. */
export function fillLoadedPrompt(
	composer: ComposerHandle,
	placeholderId: string,
	result: GetPromptResult
): void {
	const promptText = result.messages
		?.map((msg: PromptMessage) => {
			if (typeof msg.content === 'string') {
				return msg.content;
			}

			if (msg.content.type === ContentPartType.TEXT) {
				return msg.content.text;
			}

			return '';
		})
		.filter(Boolean)
		.join(PROMPT_CONTENT_SEPARATOR);

	composer.updateUploadedFile(placeholderId, (f) => ({
		...f,
		file: new File([promptText], `${f.name}${FileExtensionText.TXT}`, {
			type: MimeTypeText.PLAIN
		}),
		isLoading: false,
		size: promptText.length,
		textContent: promptText
	}));
}

/** Keep the chip of a prompt that failed to load, with the error on it. */
export function failLoadingPrompt(
	composer: ComposerHandle,
	placeholderId: string,
	error: string
): void {
	composer.updateUploadedFile(placeholderId, (f) => ({ ...f, isLoading: false, loadError: error }));
}
