// Guards the silence cut from read-aloud clips: the speech model's quiet lead and tail
// shrink to a short breath, so pieces follow each other without long gaps.

import { encodeWav } from '../src/index.js';
import { trimSilence } from '../src/trim-silence.js';
import { describe, expect, it } from 'vitest';

const RATE = 24_000;

/** `silenceMs` of silence, `toneMs` of a tone, then `silenceMs` of silence again. */
function clip(silenceMs: number, toneMs: number): Blob {
	const silence = Math.round((RATE * silenceMs) / 1000);
	const tone = Math.round((RATE * toneMs) / 1000);
	const samples = new Int16Array(silence * 2 + tone);

	for (let i = 0; i < tone; i++) {
		samples[silence + i] = Math.round(Math.sin((2 * Math.PI * 440 * i) / RATE) * 12_000);
	}

	return encodeWav(samples, RATE);
}

/** Length of a 16-bit mono WAV in ms. */
async function lengthMs(blob: Blob): Promise<number> {
	return ((blob.size - 44) / 2 / RATE) * 1000;
}

describe('trimSilence', () => {
	it('cuts the silence around the voice down to a short breath', async () => {
		const trimmed = await trimSilence(clip(300, 1000));

		// 1000 ms of tone, with 40 ms kept before and 90 ms after it
		expect(await lengthMs(trimmed)).toBeGreaterThan(1100);
		expect(await lengthMs(trimmed)).toBeLessThan(1160);
	});

	it('leaves a clip without silence, a silent one and anything not WAV alone', async () => {
		const tight = clip(0, 500);
		const silent = encodeWav(new Int16Array(RATE), RATE);
		const other = new Blob(['not a wav'], { type: 'audio/mpeg' });

		expect(await trimSilence(tight)).toBe(tight);
		expect(await trimSilence(silent)).toBe(silent);
		expect(await trimSilence(other)).toBe(other);
	});
});
