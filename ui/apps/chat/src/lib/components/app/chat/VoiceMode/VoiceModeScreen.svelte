<!--
	Voice mode: a full-screen spoken conversation with the chat model. A greeting until the first words, what is said
	shown as it is transcribed, then each exchange: the message, and the reply lit word by word as it is read aloud.
	The big microphone mutes and unmutes listening (and, while a reply plays, interrupts it); below it the model, the
	speaker and the way out.
-->
<script lang="ts">
	import { Logo } from '@ggml-org/llama-ui/app/misc';
	import { Button } from '@ggml-org/llama-ui/ui/button';
	import * as Tooltip from '@ggml-org/llama-ui/ui/tooltip';
	import { VoiceSpokenText } from '@ggml-org/llama-ui/voice';
	import { LoaderCircle, Mic, MicOff, Volume2, VolumeX, X } from '@lucide/svelte';
	import { ModelsSelector } from '#lib/components/app/index.ts';
	import { ICON_CLASS_DEFAULT, VOICE_CONVERSATION_MESSAGE } from '#lib/constants/index.ts';
	import { KeyboardKey } from '#lib/enums/index.ts';
	import { useVoiceConversation } from '#lib/hooks/use-voice-conversation.svelte.ts';
	import { uiStore } from '#lib/stores/index.ts';
	import { onMount, tick } from 'svelte';

	const conversation = useVoiceConversation();

	let scroller = $state<HTMLDivElement>();

	let level = $derived(conversation.levels.at(-1) ?? 0);
	let listening = $derived(conversation.state === 'listening');
	let status = $derived.by(() => {
		if (conversation.error) return conversation.error;

		switch (conversation.state) {
			case 'starting':
				return VOICE_CONVERSATION_MESSAGE.starting;
			case 'listening':
				return conversation.liveText ? '' : VOICE_CONVERSATION_MESSAGE.listening;
			case 'transcribing':
				return VOICE_CONVERSATION_MESSAGE.transcribing;
			case 'thinking':
				return VOICE_CONVERSATION_MESSAGE.thinking;
			case 'paused':
				return VOICE_CONVERSATION_MESSAGE.micOff;
			default:
				return '';
		}
	});
	let lastTurnId = $derived(conversation.turns.at(-1)?.id);

	onMount(() => conversation.open());

	// the newest exchange stays in view as it grows
	$effect(() => {
		void conversation.turns.at(-1)?.reply;
		void conversation.turns.length;

		tick().then(() => scroller?.scrollTo({ behavior: 'smooth', top: scroller.scrollHeight }));
	});

	function close() {
		conversation.close();
		uiStore.voiceModeOpen = false;
	}

	function handleMic() {
		// over a reply, the microphone takes the turn back
		if (conversation.state === 'speaking') {
			conversation.interrupt();

			return;
		}

		conversation.toggleMic();
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === KeyboardKey.ESCAPE) close();
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<div
	aria-label="Voice mode"
	aria-modal="true"
	class="fixed inset-0 z-50 flex flex-col bg-background pt-safe-4 pb-safe-4"
	data-slot="voice-mode"
	role="dialog"
>
	<div bind:this={scroller} class="min-h-0 flex-1 overflow-y-auto px-4">
		<div class="mx-auto flex min-h-full w-full max-w-2xl flex-col gap-6 py-6">
			{#if conversation.turns.length === 0}
				<div class="m-auto flex flex-col items-center gap-4 text-center">
					<Logo class="text-primary" style="--size: 2.5rem" />

					<h1 class="text-2xl font-semibold tracking-tight md:text-3xl">
						{VOICE_CONVERSATION_MESSAGE.greeting}
					</h1>
				</div>
			{:else}
				{#each conversation.turns as turn (turn.id)}
					<div class="flex flex-col gap-4">
						<p
							class="max-w-[80%] self-end rounded-[1.125rem] bg-(--user-bubble-background) px-3.75 py-2 break-words whitespace-pre-wrap dark:bg-primary/15"
						>
							{turn.user}
						</p>

						{#if turn.reply}
							<p class="text-md leading-relaxed break-words" data-slot="voice-mode-reply">
								<VoiceSpokenText
									spoken={turn.id === lastTurnId &&
									conversation.canSpeak &&
									!conversation.speakerMuted
										? conversation.reader.spoken
										: null}
									text={turn.reply}
								/>
							</p>
						{:else if turn.id === lastTurnId && !turn.done}
							<LoaderCircle
								class="size-icon-md animate-spin text-fg-muted motion-reduce:animate-none"
							/>
						{/if}
					</div>
				{/each}
			{/if}
		</div>
	</div>

	<div class="flex flex-col items-center gap-4 px-4">
		<p
			aria-live="polite"
			class="min-h-12 max-w-xl text-center text-lg text-balance italic text-fg-muted"
			data-slot="voice-mode-live"
		>
			{#if conversation.liveText && (listening || conversation.state === 'transcribing')}
				<VoiceSpokenText live text={conversation.liveText} />
			{:else}
				<span class="text-sm not-italic">{status}</span>
			{/if}
		</p>

		<button
			style:--voice-level={listening ? level : 0}
			aria-label={conversation.state === 'speaking'
				? VOICE_CONVERSATION_MESSAGE.interrupt
				: conversation.micMuted
					? VOICE_CONVERSATION_MESSAGE.unmute
					: VOICE_CONVERSATION_MESSAGE.mute}
			aria-pressed={conversation.micMuted}
			class={[
				'relative flex size-18 items-center justify-center rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
				conversation.micMuted
					? 'bg-surface-danger text-fg-danger'
					: 'bg-primary/15 text-foreground hover:bg-primary/25',
				conversation.state === 'thinking' && 'animate-pulse motion-reduce:animate-none'
			]}
			onclick={handleMic}
			type="button"
		>
			<!-- grows with the voice while listening -->
			<span
				style:transform="scale({1 + Math.min(level, 1) * 0.5})"
				aria-hidden="true"
				class="pointer-events-none absolute inset-0 rounded-full bg-primary/20 transition-transform duration-100 motion-reduce:hidden"
				hidden={!listening}
			></span>

			{#if conversation.micMuted}
				<MicOff class="relative size-7" />
			{:else}
				<Mic class="relative size-7" />
			{/if}
		</button>

		<div class="flex w-full max-w-2xl items-center gap-2">
			<ModelsSelector forceForegroundText useGlobalSelection />

			<div class="ml-auto flex items-center gap-2">
				<Tooltip.Root>
					<Tooltip.Trigger>
						<Button
							aria-label={conversation.speakerMuted
								? VOICE_CONVERSATION_MESSAGE.speakerOn
								: VOICE_CONVERSATION_MESSAGE.speakerOff}
							aria-pressed={conversation.speakerMuted}
							class="size-10 rounded-full p-0"
							disabled={!conversation.canSpeak}
							onclick={() => conversation.toggleSpeaker()}
							type="button"
							variant="secondary"
						>
							{#if conversation.speakerMuted || !conversation.canSpeak}
								<VolumeX class="{ICON_CLASS_DEFAULT} text-fg-danger" />
							{:else}
								<Volume2 class={ICON_CLASS_DEFAULT} />
							{/if}
						</Button>
					</Tooltip.Trigger>

					<Tooltip.Content class="max-w-64">
						<p>
							{conversation.canSpeak
								? conversation.speakerMuted
									? VOICE_CONVERSATION_MESSAGE.speakerOn
									: VOICE_CONVERSATION_MESSAGE.speakerOff
								: VOICE_CONVERSATION_MESSAGE.noSpeechModel}
						</p>
					</Tooltip.Content>
				</Tooltip.Root>

				<Button
					aria-label={VOICE_CONVERSATION_MESSAGE.close}
					class="size-10 rounded-full bg-foreground p-0 text-background hover:bg-foreground/90"
					onclick={close}
					type="button"
				>
					<X class={ICON_CLASS_DEFAULT} />
				</Button>
			</div>
		</div>
	</div>
</div>
