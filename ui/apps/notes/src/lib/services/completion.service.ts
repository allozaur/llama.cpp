import { errorFromResponse, JSON_HEADERS } from './api.ts';
import { API } from '#lib/constants/index.ts';
import type {
	CompletionPromptProgress,
	CompletionRequest,
	CompletionStreamChunk,
	CompletionTimings
} from '#lib/types/api.ts';

const DATA_PREFIX = 'data: ';

export interface CompletionCallbacks {
	onChunk?: (text: string) => void;
	onTimings?: (timings?: CompletionTimings, promptProgress?: CompletionPromptProgress) => void;
}

export interface CompletionOptions extends CompletionCallbacks {
	model?: string;
	signal?: AbortSignal;
}

function isAbort(error: unknown): boolean {
	return error instanceof Error && error.name === 'AbortError';
}

/**
 * Reads a streamed `/completion` response to its end.
 * @returns true when the server sent its final (`stop`) event
 */
export async function readCompletionStream(
	response: Response,
	callbacks: CompletionCallbacks,
	signal?: AbortSignal
): Promise<boolean> {
	const reader = response.body?.getReader();

	if (!reader) throw new Error('No response body');

	const decoder = new TextDecoder();

	let buffer = '';

	try {
		while (!signal?.aborted) {
			const { done, value } = await reader.read();

			if (done) return false;

			buffer += decoder.decode(value, { stream: true });

			const lines = buffer.split('\n');

			buffer = lines.pop() ?? '';

			for (const line of lines) {
				if (signal?.aborted) return false;

				if (!line.startsWith(DATA_PREFIX)) continue;

				let chunk: CompletionStreamChunk;

				try {
					chunk = JSON.parse(line.slice(DATA_PREFIX.length));
				} catch (error) {
					console.error('Error parsing completion chunk:', error);

					continue;
				}

				if (chunk.timings || chunk.prompt_progress) {
					callbacks.onTimings?.(chunk.timings, chunk.prompt_progress);
				}

				if (chunk.content) callbacks.onChunk?.(chunk.content);

				if (chunk.stop) return true;
			}
		}

		return false;
	} finally {
		reader.cancel().catch(() => {});
	}
}

/**
 * Continues `prompt` through llama-server's raw `/completion` endpoint, streaming.
 * An aborted request resolves; any other failure throws.
 */
export async function streamCompletion(prompt: string, options: CompletionOptions = {}) {
	const { model, signal, ...callbacks } = options;
	const body: CompletionRequest = {
		cache_prompt: true,
		prompt,
		return_progress: true,
		stream: true,
		timings_per_token: true
	};

	if (model) body.model = model;

	try {
		const response = await fetch(API.COMPLETION, {
			body: JSON.stringify(body),
			headers: JSON_HEADERS,
			method: 'POST',
			signal
		});

		if (!response.ok) throw await errorFromResponse(response);

		await readCompletionStream(response, callbacks, signal);
	} catch (error) {
		if (isAbort(error) || signal?.aborted) return;

		if (error instanceof TypeError) {
			throw new Error('Unable to connect to the server. Check that llama-server is running.', {
				cause: error
			});
		}

		throw error;
	}
}
