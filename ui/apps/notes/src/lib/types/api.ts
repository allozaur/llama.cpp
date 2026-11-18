/** Timings llama-server reports while it generates. */
export interface CompletionTimings {
	cache_n?: number;
	predicted_ms?: number;
	predicted_n?: number;
	prompt_ms?: number;
	prompt_n?: number;
}

/** Progress of prompt processing, sent with `return_progress`. */
export interface CompletionPromptProgress {
	cache: number;
	processed: number;
	time_ms: number;
	total: number;
}

/** One `data:` event of a streamed `/completion` response. */
export interface CompletionStreamChunk {
	content?: string;
	model?: string;
	prompt_progress?: CompletionPromptProgress;
	stop?: boolean;
	timings?: CompletionTimings;
}

export interface CompletionRequest {
	cache_prompt: boolean;
	model?: string;
	prompt: string;
	return_progress: boolean;
	stream: boolean;
	timings_per_token: boolean;
}

/** The part of `/props` Notes reads. */
export interface ServerProps {
	default_generation_settings?: { n_ctx?: number };
	model_alias?: string;
	model_path?: string;
	role?: string;
}

/** The part of `/v1/models` Notes reads. */
export interface ModelsList {
	data: { id: string }[];
}

export interface ApiErrorBody {
	error?: { message?: string };
}
