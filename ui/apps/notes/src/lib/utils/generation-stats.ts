import type { CompletionPromptProgress, CompletionTimings } from '#lib/types/api.ts';
import type { GenerationStats } from '#lib/types/notes.ts';

export function statsFromTimings(
	timings: CompletionTimings | undefined,
	promptProgress: CompletionPromptProgress | undefined,
	previous?: GenerationStats
): GenerationStats {
	return {
		cacheTokens: timings?.cache_n ?? previous?.cacheTokens ?? 0,
		predictedMs: timings?.predicted_ms ?? previous?.predictedMs,
		predictedTokens: timings?.predicted_n ?? previous?.predictedTokens ?? 0,
		promptMs: promptProgress?.time_ms ?? timings?.prompt_ms ?? previous?.promptMs,
		promptProgress: promptProgress ?? previous?.promptProgress,
		promptTokens: timings?.prompt_n ?? previous?.promptTokens ?? 0
	};
}

/** Tokens in the context after a run: cached, processed and generated. */
export function contextUsed(stats: GenerationStats): number {
	return stats.cacheTokens + stats.promptTokens + stats.predictedTokens;
}

/** Generation speed, or undefined before it can be measured. */
export function tokensPerSecond(stats: GenerationStats): number | undefined {
	// the first token comes with a predicted_ms below 1 ms, which gives a meaningless speed
	if (!stats.predictedMs || stats.predictedMs < 1 || stats.predictedTokens <= 0) return undefined;

	return (stats.predictedTokens / stats.predictedMs) * 1000;
}

/** Share of the prompt processed so far, 0 to 100, or undefined when there is nothing to show. */
export function promptProgressPercent(stats: GenerationStats): number | undefined {
	const progress = stats.promptProgress;

	if (!progress) return undefined;

	const processed = progress.processed - progress.cache;
	const total = progress.total - progress.cache;

	if (processed <= 0 || processed >= total) return undefined;

	return Math.round((processed / total) * 100);
}
