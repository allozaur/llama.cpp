// Guards reading a reply aloud from a word the user picks: the voice moves there, back or
// ahead, plays audio it already fetched without asking for it again, and starts inside a
// sentence at about where the word falls in it.

import { ReplyReader } from '@ggml-org/llama-voice/svelte';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

const DURATION = 2;

/** An audio element that "plays" a clip of DURATION seconds until finish() is called. */
class FakeAudio extends EventTarget {
	currentTime = 0;
	defaultPlaybackRate = 1;
	duration = Number.NaN;
	static last: FakeAudio | null = null;
	onended: (() => void) | null = null;
	onerror: (() => void) | null = null;
	paused = true;
	playbackRate = 1;
	preservesPitch = true;
	/** What each play() started on: the clip and where in it */
	starts: { src: string; time: number }[] = [];
	private source = '';

	get src() {
		return this.source;
	}

	set src(value: string) {
		this.source = value;
		this.currentTime = 0;
		this.duration = Number.NaN;
		// metadata comes after the source is set, as in a browser
		queueMicrotask(() => {
			this.duration = DURATION;
			this.dispatchEvent(new Event('loadedmetadata'));
		});
	}

	constructor() {
		super();
		FakeAudio.last = this;
	}

	override dispatchEvent(event: Event): boolean {
		if (event.type === 'ended') this.onended?.();

		return super.dispatchEvent(event);
	}

	/** The clip plays to its end. */
	finish() {
		this.currentTime = this.duration;
		this.paused = true;
		this.onended?.();
	}

	pause() {
		this.paused = true;
	}

	play() {
		this.paused = false;
		this.starts.push({ src: this.source, time: this.currentTime });

		return Promise.resolve();
	}
}

const REPLY = 'One two three. Four five six. Seven eight nine.';
const at = (word: string) => REPLY.indexOf(word);
const settle = () => new Promise((resolve) => setTimeout(resolve, 20));

function reader() {
	const synthesize = vi.fn(async (text: string) => new Blob([text], { type: 'audio/test' }));
	const replyReader = new ReplyReader({ synthesize });

	replyReader.reset();
	replyReader.update(REPLY, true);

	return { replyReader, synthesize };
}

/** The text of the clip that last started, and where in it. */
function lastStart() {
	const start = FakeAudio.last!.starts.at(-1)!;

	return { text: clips.get(start.src), time: start.time };
}

const clips = new Map<string, string>();

beforeAll(() => {
	vi.stubGlobal('Audio', FakeAudio);
	vi.spyOn(URL, 'createObjectURL').mockImplementation((blob) => {
		const url = `blob:test/${clips.size}`;

		void (blob as Blob).text().then((text) => clips.set(url, text));

		return url;
	});
	vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
});

afterAll(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe('ReplyReader.seek', () => {
	it('jumps ahead to a later sentence', async () => {
		const { replyReader, synthesize } = reader();

		await settle();
		expect(lastStart().text).toBe('One two three.');

		expect(replyReader.seek(at('Seven'))).toBe(true);
		expect(replyReader.spoken).toBe(at('Seven'));
		await settle();

		expect(lastStart()).toEqual({ text: 'Seven eight nine.', time: 0 });
		// the later sentences were fetched while the first played: nothing is asked for twice
		expect(synthesize).toHaveBeenCalledTimes(3);
		replyReader.stop();
	});

	it('goes back into a sentence already read, from about where the word is', async () => {
		const { replyReader, synthesize } = reader();

		await settle();
		FakeAudio.last!.finish();
		await settle();
		expect(lastStart().text).toBe('Four five six.');

		expect(replyReader.seek(at('three'))).toBe(true);
		expect(replyReader.spoken).toBe(at('three'));
		await settle();

		const { text, time } = lastStart();

		expect(text).toBe('One two three.');
		expect(time).toBeGreaterThan(0.8);
		expect(time).toBeLessThan(DURATION);
		expect(synthesize).toHaveBeenCalledTimes(3);

		// and reads on from there
		FakeAudio.last!.finish();
		await settle();
		expect(lastStart()).toEqual({ text: 'Four five six.', time: 0 });
		replyReader.stop();
	});

	it('has nowhere to go once muted or read to the end', async () => {
		const { replyReader } = reader();

		replyReader.muted = true;
		expect(replyReader.seek(at('Four'))).toBe(false);

		replyReader.muted = false;
		replyReader.stop();
		expect(replyReader.seek(at('Four'))).toBe(false);
	});
});
