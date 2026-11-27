import type { Component } from 'svelte';

/** An account whose token a model download passes to llama-server, to reach a gated repo. */
export interface ModelDownloadAuth {
	/** The token for the next download; nothing when no one is signed in. */
	token(): Promise<string | undefined>;
}

/** A line above the download options of a model in Discover Models. */
export type ModelNotice = Component<{
	/** Whether the repo asks for access before a download. */
	isGated: boolean;
	/** Full Hugging Face model id, e.g. `google/gemma-3-4b-it-qat-q4_0-gguf`. */
	modelId: string;
}>;
