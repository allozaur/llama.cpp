import { encodeWav } from './wav.js';

/** Silence kept before the voice starts and after it ends, so pieces still breathe. */
const LEAD_MS = 40;
const TAIL_MS = 90;
/** A sample under this share of the clip's loudest one is silence. */
const SILENCE_SHARE = 0.03;

/**
 * A WAV with the silence a speech model puts around what it says cut down to a short
 * breath, so pieces read one after another (a sentence, then the paragraph after an
 * empty line) follow without long gaps. Anything but 16-bit PCM is returned as it is.
 */
export async function trimSilence(blob: Blob): Promise<Blob> {
	const bytes = await blob.arrayBuffer();
	const pcm = readPcm16(bytes);

	if (!pcm || pcm.channels !== 1) return blob;

	const { sampleRate, samples } = pcm;

	let loudest = 0;

	for (let i = 0; i < samples.length; i++) loudest = Math.max(loudest, Math.abs(samples[i]));

	if (loudest === 0) return blob;

	const threshold = loudest * SILENCE_SHARE;

	let first = 0;
	let last = samples.length - 1;

	while (first < samples.length && Math.abs(samples[first]) < threshold) first++;
	while (last > first && Math.abs(samples[last]) < threshold) last--;

	const start = Math.max(0, first - Math.round((sampleRate * LEAD_MS) / 1000));
	const end = Math.min(samples.length, last + 1 + Math.round((sampleRate * TAIL_MS) / 1000));

	if (start === 0 && end === samples.length) return blob;

	return encodeWav(samples.slice(start, end), sampleRate);
}

/** The samples of a 16-bit PCM WAV, or null for any other format. */
function readPcm16(
	bytes: ArrayBuffer
): { channels: number; sampleRate: number; samples: Int16Array } | null {
	const view = new DataView(bytes);
	const tag = (offset: number) =>
		String.fromCharCode(...new Uint8Array(bytes, offset, Math.min(4, bytes.byteLength - offset)));

	if (bytes.byteLength < 12 || tag(0) !== 'RIFF' || tag(8) !== 'WAVE') return null;

	let channels = 0;
	let sampleRate = 0;
	let bits = 0;
	let offset = 12;

	while (offset + 8 <= bytes.byteLength) {
		const id = tag(offset);
		// a streamed WAV may leave the data size unknown (0xFFFFFFFF): it runs to the end
		const size = Math.min(view.getUint32(offset + 4, true), bytes.byteLength - offset - 8);
		const body = offset + 8;

		if (id === 'fmt ') {
			if (view.getUint16(body, true) !== 1) return null;

			channels = view.getUint16(body + 2, true);
			sampleRate = view.getUint32(body + 4, true);
			bits = view.getUint16(body + 14, true);
		} else if (id === 'data') {
			if (bits !== 16 || !sampleRate) return null;

			const samples = new Int16Array(bytes.slice(body, body + size - (size % 2)));

			return { channels, sampleRate, samples };
		}

		offset = body + size + (size % 2);
	}

	return null;
}
