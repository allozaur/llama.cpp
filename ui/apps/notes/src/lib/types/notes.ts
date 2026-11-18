export interface Note {
	content: string;
	createdAt: number;
	id: string;
	updatedAt: number;
}

/** What a note's generation run reports while it runs and after it. */
export interface GenerationStats {
	cacheTokens: number;
	predictedMs?: number;
	predictedTokens: number;
	promptMs?: number;
	promptProgress?: { cache: number; processed: number; time_ms: number; total: number };
	promptTokens: number;
}
