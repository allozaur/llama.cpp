/**
 * Voice mode: a spoken conversation with the chat model, hands-free.
 *
 * Each turn listens (echo cancellation on, as the reply plays from the same device),
 * shows what is said as it is transcribed, and ends after a pause in speech: the text
 * goes to the chat as a message. The reply streams on screen and, when a model that
 * speaks is available, is read aloud sentence by sentence; then the next turn listens.
 * Speaking while the reply plays stops it and starts a new turn.
 */

import {
	describeMicrophoneError,
	PauseDetector,
	synthesizeSpeech,
	VOICE_LEVELS_INTERVAL_MS,
	VoiceCapture,
	VoiceCaptureError
} from '@ggml-org/llama-voice';
import { ReplyReader, VoiceRecorder } from '@ggml-org/llama-voice/svelte';
import { SETTINGS_KEYS } from '#lib/constants/index.ts';
import { MessageRole, VoiceInputMode, VoiceMode } from '#lib/enums/index.ts';
import { VoiceService } from '#lib/services/voice.service.ts';
import {
	chatStore,
	conversationsStore,
	modelsStore,
	serverStore,
	settingsStore
} from '#lib/stores/index.ts';
import { resolveVoiceMode } from '#lib/utils/voice-mode.ts';
import { onDestroy, untrack } from 'svelte';

/** Where a voice conversation is. */
export type VoiceConversationState =
	| 'idle'
	| 'starting'
	| 'listening'
	| 'transcribing'
	| 'thinking'
	| 'speaking'
	| 'paused';

/** One exchange: what was said, and the reply. */
export interface VoiceTurn {
	id: number;
	user: string;
	reply: string;
	/** The message went to the chat, so its reply is followed */
	sent: boolean;
	done: boolean;
}

// voice mode talks to a device that also plays the reply: the browser's clean-up removes its echo
const CONVERSATION_CONSTRAINTS: MediaTrackConstraints = {
	autoGainControl: true,
	echoCancellation: true,
	noiseSuppression: true
};
/** Silence after speech that ends a turn. */
const TURN_PAUSE_MS = 900;
/** Sound over the reply that pauses it, to hear whether it is speech. */
const BARGE_IN_MS = 300;
/** How long a paused reply waits for speech before it goes on: no speech, it was a noise or its own echo. */
const BARGE_IN_CONFIRM_MS = 1000;

export function useVoiceConversation() {
	const config = $derived(settingsStore.config);
	const isRouter = $derived(serverStore.isRouterMode);
	const chatModel = $derived(modelsStore.activeModelId);
	const hasAudio = (model: string | null) => {
		void modelsStore.props.cacheVersion;

		return model ? modelsStore.props.modelSupportsAudio(model) : false;
	};
	const transcriptionSetting = $derived(
		String(config[SETTINGS_KEYS.VOICE_TRANSCRIPTION_MODEL] ?? '')
	);
	// what is said always becomes text here, so it is resolved as dictation
	const resolution = $derived.by(() => {
		void modelsStore.props.cacheVersion;

		const loadedAudioModel = isRouter
			? (modelsStore.models.find(
					(option) => hasAudio(option.model) && modelsStore.isModelLoaded(option.model)
				)?.model ?? null)
			: null;

		return resolveVoiceMode({
			chatModel,
			chatModelHasAudio: hasAudio(chatModel),
			isRouter,
			loadedAudioModel,
			setting: VoiceInputMode.DICTATION,
			transcriptionModel: transcriptionSetting,
			transcriptionModelHasAudio: hasAudio(transcriptionSetting || null)
		});
	});
	// the chat model reads its own replies when it can speak, else another model that can
	const speechModel = $derived.by(() => {
		const options = modelsStore.models;
		const chat = options.find((option) => option.model === chatModel);

		if (chat?.speaks) return chat.model;

		return isRouter ? (options.find((option) => option.speaks)?.model ?? null) : null;
	});

	let state = $state<VoiceConversationState>('idle');
	let micMuted = $state(false);
	let speakerMuted = $state(false);
	let liveText = $state('');
	let levels = $state<number[]>([]);
	let error = $state<string | null>(null);
	let turns = $state<VoiceTurn[]>([]);
	let recorder: VoiceRecorder | null = null;
	let monitor: VoiceCapture | null = null;
	let generation = 0;
	let turnId = 0;
	// the current reply was seen loading: until then, not loading does not mean done
	let replyStarted = false;
	// the reply is paused over a sound, until speech confirms the interruption or a second passes
	let tentative = false;
	let tentativeTimer: ReturnType<typeof setTimeout> | undefined;
	// a reply paused by an interruption: it goes on if the microphone is muted or nothing is
	// said, and is dropped once the user's turn is sent
	let heldReply = $state(false);

	const reader = new ReplyReader({
		onIdle: () => {
			if (state === 'speaking' || state === 'thinking') void listen();
		},
		playbackRate: () => Number(config[SETTINGS_KEYS.VOICE_READING_SPEED]) || 1.25,
		synthesize: (text, signal) => {
			return synthesizeSpeech(VoiceService.serverContext().context, text, {
				model: isRouter && speechModel ? speechModel : undefined,
				signal
			});
		}
	});
	const currentTurn = $derived(turns[turns.length - 1]);

	// the reply as it streams, then as stored once done; the conversation is read here, as a
	// first message creates it while being sent
	$effect(() => {
		const turn = currentTurn;
		const convId = conversationsStore.activeConversation?.id;

		if (!turn || !turn.sent || turn.done || !convId) return;

		const streaming = chatStore.getChatStreaming(convId);
		const loading = chatStore.isChatLoading(convId);

		untrack(() => {
			if (loading) {
				replyStarted = true;

				if (!streaming) return;

				turn.reply = streaming.response;
				reader.update(streaming.response, false);

				return;
			}

			if (replyStarted) finishReply(turn);
		});
	});

	/** The reply is complete: as stored, read to its end. */
	function finishReply(turn: VoiceTurn) {
		if (turn.done) return;

		const last = conversationsStore.activeMessages.at(-1);
		const text = last?.role === MessageRole.ASSISTANT ? last.content : turn.reply;

		turn.reply = text;
		turn.done = true;
		reader.update(text, true);
	}

	// the reply plays: speaking over it may interrupt it
	$effect(() => {
		if (reader.speaking && state === 'thinking') {
			untrack(() => {
				state = 'speaking';
				void watchForBargeIn(generation);
			});
		}
	});

	function stopRecorder() {
		recorder?.cancel();
		recorder = null;
	}

	function stopMonitor() {
		monitor?.cancel();
		monitor = null;
	}

	/**
	 * Starts a turn: listens until the speaker pauses, then sends what was said. `floor` is
	 * the room's noise level when known; `tentative` listens over a paused reply, which
	 * goes on unless speech is heard within a second.
	 */
	async function listen(options: { floor?: number; tentative?: boolean } = {}) {
		stopMonitor();
		stopRecorder();
		liveText = '';
		levels = [];

		if (micMuted) {
			state = 'paused';

			return;
		}

		if (resolution.mode === VoiceMode.UNAVAILABLE) {
			error = resolution.reason;
			state = 'paused';

			return;
		}

		const run = ++generation;
		const model = resolution.transcriptionModel;
		const pauses = new PauseDetector({
			floor: options.floor,
			intervalMs: VOICE_LEVELS_INTERVAL_MS,
			maxSegmentMs: Number.POSITIVE_INFINITY,
			pauseMs: TURN_PAUSE_MS
		});
		const active = new VoiceRecorder();

		recorder = active;
		state = 'starting';

		try {
			// echo cancellation on, whatever the settings: the replies play while it listens
			const wiring = await VoiceService.sessionOptions(config, {
				constraints: CONVERSATION_CONSTRAINTS,
				isRouter,
				model
			});

			await active.start({
				...wiring,
				onLevels: (next) => {
					levels = next as number[];

					if (run !== generation) return;

					const cut = pauses.push(next.at(-1) ?? 0);

					// speech over the paused reply: the interruption was meant
					if (tentative && pauses.heardSpeech) confirmInterrupt();

					if (state === 'listening' && cut) void endTurn(run);
				},
				onText: (text) => {
					if (run === generation) liveText = text;
				}
			});
		} catch (cause) {
			if (run !== generation) return;

			error = cause instanceof VoiceCaptureError ? cause.message : describeMicrophoneError(cause);
			state = 'paused';

			return;
		}

		if (run !== generation) {
			active.cancel();

			return;
		}

		error = null;
		state = 'listening';

		if (options.tentative && tentative) {
			clearTimeout(tentativeTimer);
			tentativeTimer = setTimeout(() => {
				if (run === generation && tentative && !pauses.heardSpeech) resumeReading();
			}, BARGE_IN_CONFIRM_MS);
		}
	}

	/** The speaker paused: what they said goes to the chat. */
	async function endTurn(run: number) {
		const active = recorder;

		if (!active || run !== generation) return;

		state = 'transcribing';
		recorder = null;

		let text = liveText;

		try {
			const result = await active.stop();

			text = (await (result.transcript ?? Promise.resolve(text))) || result.liveText || text;
		} catch (cause) {
			console.warn('Voice mode: the turn could not be transcribed:', cause);
		}

		if (run !== generation) return;

		text = text.trim();

		// nothing understood: a reply held for this turn goes on, else listen again
		if (!text) {
			if (heldReply) resumeReading();
			else void listen();

			return;
		}

		// the user had something to say: the reply they interrupted gives way
		dropHeldReply();

		const turn: VoiceTurn = { done: false, id: ++turnId, reply: '', sent: false, user: text };

		turns.push(turn);
		liveText = '';
		reader.reset();
		reader.muted = speakerMuted || !speechModel;
		replyStarted = false;
		state = 'thinking';

		const sending = chatStore.sendMessage(text);

		// followed from here: the message is on its way
		turns[turns.length - 1].sent = true;

		try {
			await sending;

			// a reply that was never seen streaming (an error, a very short one) ends here
			if (run === generation) finishReply(turns[turns.length - 1]);
		} catch (cause) {
			if (run !== generation) return;

			error = cause instanceof Error ? cause.message : String(cause);
			void listen();
		}
	}

	/** While the reply plays, speech over it stops it and starts a new turn. */
	async function watchForBargeIn(run: number) {
		if (micMuted || speakerMuted || !speechModel || monitor) return;

		const capture = new VoiceCapture({ constraints: CONVERSATION_CONSTRAINTS });

		let speechMs = 0;
		let floor = 1;

		monitor = capture;
		capture.onLevels((next) => {
			const level = next.at(-1) ?? 0;

			floor = Math.min(level, floor + 0.002);
			speechMs = level > floor + 0.2 ? speechMs + VOICE_LEVELS_INTERVAL_MS : 0;

			if (speechMs >= BARGE_IN_MS && run === generation && reader.speaking && !reader.paused) {
				bargeIn(floor);
			}
		});

		try {
			await capture.start();
		} catch {
			// no barge-in without a microphone; the turn still follows the reply
		}

		if (run !== generation || monitor !== capture || state !== 'speaking') {
			capture.cancel();

			if (monitor === capture) monitor = null;
		}
	}

	/** A sound over the reply: it pauses, and the next second tells whether it was speech. */
	function bargeIn(floor: number) {
		reader.pause();
		heldReply = true;
		tentative = true;
		void listen({ floor, tentative: true });
	}

	/** No speech came, or the microphone was muted: the reply goes on from where it paused. */
	function resumeReading() {
		heldReply = false;
		tentative = false;
		clearTimeout(tentativeTimer);
		generation++;
		stopRecorder();
		liveText = '';
		levels = [];
		state = 'speaking';
		reader.resume();
		void watchForBargeIn(generation);
	}

	/** Speech came: the turn that started goes on, over the reply held where it paused. */
	function confirmInterrupt() {
		tentative = false;
		clearTimeout(tentativeTimer);
	}

	/** The interrupted reply is given up: its reading and its generation stop. */
	function dropHeldReply() {
		if (!heldReply) return;

		heldReply = false;
		reader.stop();

		const convId = conversationsStore.activeConversation?.id;

		if (convId && chatStore.isChatLoading(convId)) void chatStore.stopGeneration();

		const turn = currentTurn;

		if (turn) turn.done = true;
	}

	/** Holds the reply where it is, and listens; muting the microphone lets it go on. */
	function interrupt() {
		tentative = false;
		clearTimeout(tentativeTimer);
		reader.pause();
		heldReply = true;
		void listen();
	}

	/**
	 * Reads the reply on from `offset`, e.g. a word tapped while it is read; a reply held for
	 * an interruption goes on from there too, as the tap says the user wants to hear it.
	 */
	function readFrom(offset: number) {
		if (!reader.speaking && !heldReply) return;

		if (heldReply) resumeReading();

		reader.seek(offset);
	}

	/** Starts the conversation; the click that opened voice mode unlocked playback (unlockVoicePlayback). */
	function open() {
		error = null;
		turns = [];
		void listen();
	}

	function close() {
		heldReply = false;
		tentative = false;
		clearTimeout(tentativeTimer);
		generation++;
		stopRecorder();
		stopMonitor();
		reader.stop();
		state = 'idle';
		liveText = '';
	}

	function toggleMic() {
		micMuted = !micMuted;

		if (micMuted) {
			// an interrupted reply goes on from where it paused
			if (heldReply) {
				resumeReading();

				return;
			}

			if (state === 'listening' || state === 'starting') {
				generation++;
				stopRecorder();
				state = 'paused';
			}

			stopMonitor();

			return;
		}

		if (state === 'paused') void listen();
	}

	function toggleSpeaker() {
		speakerMuted = !speakerMuted;
		reader.muted = speakerMuted || !speechModel;

		if (speakerMuted) stopMonitor();
	}

	onDestroy(close);

	return {
		/** Whether replies can be read aloud: a model that speaks is available. */
		get canSpeak() {
			return !!speechModel;
		},
		close,
		get error() {
			return error;
		},
		interrupt,
		get levels() {
			return levels;
		},
		get liveText() {
			return liveText;
		},
		get micMuted() {
			return micMuted;
		},
		open,
		get reader() {
			return reader;
		},
		readFrom,
		/** Whether the reply is being read, or held for an interruption: readFrom() can move it. */
		get reading() {
			return reader.speaking || heldReply;
		},
		get speakerMuted() {
			return speakerMuted;
		},
		get state() {
			return state;
		},
		toggleMic,
		toggleSpeaker,
		get turns() {
			return turns;
		},
		/** Why voice mode cannot listen, or null. */
		get unavailableReason() {
			return resolution.mode === VoiceMode.UNAVAILABLE ? resolution.reason : null;
		}
	};
}
