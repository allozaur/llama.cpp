import { type ReadAloudPiece, readAloudPieces } from '../read-aloud.js';

// one element plays every reply: unlocked once inside a click, it may play later (iOS asks for that)
let sharedAudio: HTMLAudioElement | null = null;

function playbackElement(): HTMLAudioElement {
	sharedAudio ??= new Audio();

	return sharedAudio;
}

/**
 * Plays nothing, inside a click: browsers that let a page play sound only after a gesture
 * (iOS) then let replies play later. Call it in the handler of the click that opens voice mode.
 */
export function unlockVoicePlayback(): void {
	if (typeof Audio === 'undefined') return;

	const audio = playbackElement();

	audio.muted = true;
	audio.play().catch(() => {});
	audio.pause();
	audio.muted = false;
}

export interface ReplyReaderOptions {
	/** Speaks a piece of text, e.g. with synthesizeSpeech(); the WAV or other audio to play */
	synthesize: (text: string, signal: AbortSignal) => Promise<Blob>;
	/** Called once the reply is done and all of it has been read (or skipped while muted) */
	onIdle?: () => void;
}

/**
 * Reads a reply aloud while it streams: give it the reply as it grows with update(),
 * and it speaks each complete sentence in order, fetching the next one while the
 * current one plays. `spoken` follows the voice through the reply as written, for
 * VoiceSpokenText. Muted, it reads nothing and `spoken` keeps up with the text.
 */
export class ReplyReader {
	/** Whether a piece is being fetched or played */
	speaking = $state(false);
	/** Characters of the reply read so far */
	spoken = $state(0);

	private audio: HTMLAudioElement | null = null;
	private controller = new AbortController();
	private done = false;
	private frame: number | null = null;
	private idle = true;
	private isMuted = false;
	private readonly options: ReplyReaderOptions;
	private playing = false;
	// bookkeeping the UI never reads
	// eslint-disable-next-line svelte/prefer-svelte-reactivity
	private prefetched = new Map<ReadAloudPiece, Promise<Blob>>();
	private queue: ReadAloudPiece[] = [];
	private queuedTo = 0;
	private text = '';

	get muted(): boolean {
		return this.isMuted;
	}

	set muted(value: boolean) {
		this.isMuted = value;

		if (value) this.silence();
	}

	constructor(options: ReplyReaderOptions) {
		this.options = options;
	}

	/** Starts a new reply. */
	reset(): void {
		this.stop();
		this.controller = new AbortController();
		this.text = '';
		this.done = false;
		this.queuedTo = 0;
		this.spoken = 0;
		this.idle = false;
	}

	/** Stops reading: the current piece, and what was still to come. */
	stop(): void {
		this.controller.abort();
		this.queue = [];
		this.prefetched.clear();
		this.stopAudio();
		this.playing = false;
		this.speaking = false;
		this.idle = true;
	}

	/** The reply so far; `done` once it is complete. */
	update(text: string, done: boolean): void {
		this.text = text;
		this.done = done;

		for (const piece of readAloudPieces(text, this.queuedTo, done)) {
			this.queue.push(piece);
			this.queuedTo = piece.end;
		}

		void this.pump();
	}

	private element(): HTMLAudioElement {
		this.audio ??= playbackElement();

		return this.audio;
	}

	private fetchPiece(piece: ReadAloudPiece): Promise<Blob> {
		let pending = this.prefetched.get(piece);

		if (!pending) {
			pending = this.options.synthesize(piece.speech, this.controller.signal);
			// a failed fetch is handled where it is played
			pending.catch(() => {});
			this.prefetched.set(piece, pending);
		}

		return pending;
	}

	private finishIfDone(): void {
		if (this.playing || this.queue.length > 0 || !this.done || this.queuedTo < this.text.length) {
			return;
		}

		this.speaking = false;
		this.spoken = this.text.length;

		if (!this.idle) {
			this.idle = true;
			this.options.onIdle?.();
		}
	}

	private async play(piece: ReadAloudPiece, blob: Blob, signal: AbortSignal): Promise<void> {
		const audio = this.element();
		const url = URL.createObjectURL(blob);

		try {
			await new Promise<void>((resolve) => {
				const follow = () => {
					if (audio.duration > 0 && Number.isFinite(audio.duration)) {
						const share = Math.min(audio.currentTime / audio.duration, 1);

						this.spoken = Math.max(
							this.spoken,
							piece.start + Math.round((piece.end - piece.start) * share)
						);
					}

					this.frame = requestAnimationFrame(follow);
				};
				const end = () => {
					audio.onended = null;
					audio.onerror = null;
					signal.removeEventListener('abort', end);
					resolve();
				};

				audio.onended = end;
				audio.onerror = end;
				signal.addEventListener('abort', end);
				audio.src = url;
				audio.play().then(
					() => (this.frame = requestAnimationFrame(follow)),
					() => end()
				);
			});
		} finally {
			if (this.frame !== null) cancelAnimationFrame(this.frame);

			this.frame = null;
			URL.revokeObjectURL(url);
		}
	}

	private async pump(): Promise<void> {
		if (this.playing) return;

		const piece = this.queue.shift();

		if (!piece) {
			this.finishIfDone();

			return;
		}

		const { signal } = this.controller;

		this.playing = true;
		this.speaking = true;

		if (piece.speech && !this.isMuted) {
			// the next piece is fetched while this one plays
			if (this.queue[0]) this.fetchPiece(this.queue[0]);

			try {
				const blob = await this.fetchPiece(piece);

				if (!signal.aborted && !this.isMuted) await this.play(piece, blob, signal);
			} catch (error) {
				if (!signal.aborted) console.warn('Reading the reply aloud failed:', error);
			}
		}

		this.prefetched.delete(piece);

		if (signal.aborted) return;

		this.spoken = Math.max(this.spoken, piece.end);
		this.playing = false;
		void this.pump();
	}

	/** Muting mid-piece: the voice stops, the text keeps up. */
	private silence(): void {
		this.stopAudio();
		this.spoken = Math.max(this.spoken, this.queuedTo);
	}

	private stopAudio(): void {
		if (this.frame !== null) cancelAnimationFrame(this.frame);

		this.frame = null;

		const audio = this.audio;

		if (audio && !audio.paused) audio.pause();

		audio?.dispatchEvent(new Event('ended'));
	}
}
