import { PromptDrift } from '$lib/enums';
import type { DatabaseMessage, DatabasePrompt } from '$lib/types';

/**
 * Tells how a system message differs from the library prompt it was made from.
 * The side edited last is the newer one: a prompt saved after the message
 * means the library changed, otherwise the message did.
 */
export function getPromptDrift(
	message: Pick<DatabaseMessage, 'content' | 'timestamp'>,
	prompt: DatabasePrompt | undefined
): PromptDrift {
	if (!prompt) return PromptDrift.MISSING;

	if (message.content.trim() === prompt.content.trim()) return PromptDrift.NONE;

	return prompt.lastModified > message.timestamp ? PromptDrift.LIBRARY : PromptDrift.MESSAGE;
}
