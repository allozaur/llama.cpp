import {
	contextUsed,
	promptProgressPercent,
	statsFromTimings,
	tokensPerSecond
} from '#lib/utils/generation-stats.ts';
import { describe, expect, it } from 'vitest';

describe('generation stats', () => {
	it('keeps earlier values an event does not carry', () => {
		const first = statsFromTimings({ cache_n: 3, prompt_ms: 20, prompt_n: 10 }, undefined);
		const second = statsFromTimings({ predicted_ms: 500, predicted_n: 5 }, undefined, first);

		expect(second).toMatchObject({
			cacheTokens: 3,
			predictedMs: 500,
			predictedTokens: 5,
			promptMs: 20,
			promptTokens: 10
		});
		expect(contextUsed(second)).toBe(18);
	});

	it('measures speed in tokens per second', () => {
		expect(
			tokensPerSecond(statsFromTimings({ predicted_ms: 500, predicted_n: 5 }, undefined))
		).toBe(10);
	});

	it('gives no speed for the first token', () => {
		expect(
			tokensPerSecond(statsFromTimings({ predicted_ms: 0.002, predicted_n: 1 }, undefined))
		).toBeUndefined();
	});

	it('reports prompt progress without the cached part', () => {
		const stats = statsFromTimings(undefined, {
			cache: 100,
			processed: 150,
			time_ms: 9,
			total: 300
		});

		expect(promptProgressPercent(stats)).toBe(25);
	});

	it('reports no progress once the prompt is processed', () => {
		const stats = statsFromTimings(undefined, { cache: 0, processed: 300, time_ms: 9, total: 300 });

		expect(promptProgressPercent(stats)).toBeUndefined();
	});
});
