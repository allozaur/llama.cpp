import { JSON_HEADERS } from './api.ts';
import { API } from '#lib/constants/index.ts';

/**
 * Counts the tokens of `content` with the server's tokenizer.
 * @param model the model to tokenize with, required when llama-server routes between models
 * @returns the count, or null when the server could not tell
 */
export async function countTokens(
	content: string,
	model?: string,
	signal?: AbortSignal
): Promise<number | null> {
	try {
		const response = await fetch(API.TOKENIZE, {
			body: JSON.stringify(model ? { content, model } : { content }),
			headers: JSON_HEADERS,
			method: 'POST',
			signal
		});

		if (!response.ok) return null;

		const data: { tokens?: unknown[] } = await response.json();

		return Array.isArray(data.tokens) ? data.tokens.length : null;
	} catch {
		return null;
	}
}
