import { VOICE_API_PATHS } from './constants.js';
import { VoiceTranscriptionError } from './errors.js';
import type { VoiceServerContext } from './types.js';

export interface SynthesizeSpeechOptions {
	/** Model id, required by a router server */
	model?: string;
	/** One of the model's voices (`voices` of GET /props); left out, its default */
	voice?: string;
	signal?: AbortSignal;
}

/**
 * Speaks `text` with llama-server's POST /v1/audio/speech and returns the WAV.
 * @throws VoiceTranscriptionError with the server's message when it refuses
 */
export async function synthesizeSpeech(
	context: VoiceServerContext,
	text: string,
	options: SynthesizeSpeechOptions = {}
): Promise<Blob> {
	const response = await (context.fetch ?? fetch)(context.resolveUrl(VOICE_API_PATHS.SPEECH), {
		body: JSON.stringify({
			input: text,
			response_format: 'wav',
			...(options.model ? { model: options.model } : {}),
			...(options.voice ? { voice: options.voice } : {})
		}),
		headers: { ...context.getHeaders?.(), 'Content-Type': 'application/json' },
		method: 'POST',
		signal: options.signal
	});

	if (!response.ok) {
		let message = `Speech failed (${response.status})`;

		try {
			const data = await response.json();

			if (typeof data?.error?.message === 'string') message = data.error.message;
		} catch {
			// not JSON: keep the status
		}

		throw new VoiceTranscriptionError(message, response.status);
	}

	return await response.blob();
}
