<!--
	An intro slide: a fragment of the real UI, built from the app's own components so it follows
	the theme. The fragment only illustrates: it is inert and hidden from screen readers, which
	read the slide's sentence instead.
-->
<script lang="ts">
	import * as ToggleGroup from '@ggml-org/llama-ui/ui/toggle-group';
	import ChatMessageToolCallBlock from '#lib/components/app/chat/ChatMessages/ChatMessage/ChatMessageToolCall/ChatMessageToolCallBlock.svelte';
	import {
		ChatFormActionsRecording,
		ChatMessageUserBubble,
		MarkdownContent,
		ModelBadge
	} from '#lib/components/app/index.ts';
	import {
		ICON_CLASS_DEFAULT,
		ONBOARDING_SAMPLE,
		SETTINGS_CHAT_SECTIONS,
		SETTINGS_KEYS
	} from '#lib/constants/index.ts';
	import { ChatFormVoiceState, OnboardingStep, VoiceMode } from '#lib/enums/index.ts';
	import type { ColorMode } from '#lib/enums/ui.enums.ts';
	import { settingsStore } from '#lib/stores/index.ts';
	import { setMode } from 'mode-watcher';

	interface Props {
		step: OnboardingStep;
	}

	let { step }: Props = $props();

	// the same choices as Settings > General > Theme
	const themeOptions: SettingsFieldConfig['options'] =
		SETTINGS_CHAT_SECTIONS.flatMap((section) => section.fields ?? []).find(
			(field) => field.key === SETTINGS_KEYS.THEME
		)?.options ?? [];

	let theme = $derived(String(settingsStore.config[SETTINGS_KEYS.THEME] ?? ''));

	function handleThemeChange(value: string) {
		// a toggle group lets the active item be clicked off; the theme always has a value
		if (!value) return;

		settingsStore.updateConfig(SETTINGS_KEYS.THEME, value);
		setMode(value as ColorMode);
	}
</script>

<div class="rounded-xl border border-border/60 bg-background p-4 md:p-6">
	<div aria-hidden="true" class="flex flex-col gap-4" inert>
		{#if step === OnboardingStep.INTRO_CHAT}
			<div class="flex flex-col items-end">
				<ChatMessageUserBubble content={ONBOARDING_SAMPLE.question} />
			</div>

			<MarkdownContent content={ONBOARDING_SAMPLE.answer} />

			<div>
				<ModelBadge model={ONBOARDING_SAMPLE.modelId} />
			</div>
		{:else if step === OnboardingStep.INTRO_TOOLS}
			{#each ONBOARDING_SAMPLE.toolSections as section (section.toolCallId)}
				<ChatMessageToolCallBlock isStreaming={false} open {section} />
			{/each}
		{:else}
			<ChatFormActionsRecording
				elapsedMs={ONBOARDING_SAMPLE.voiceMs}
				levels={ONBOARDING_SAMPLE.voiceLevels}
				liveCaption={ONBOARDING_SAMPLE.transcript}
				mode={VoiceMode.VOICE_MESSAGE}
				onCancel={() => {}}
				onStop={() => {}}
				state={ChatFormVoiceState.RECORDING}
			/>
		{/if}
	</div>
</div>

{#if step === OnboardingStep.INTRO_CHAT && themeOptions.length > 0}
	<div class="flex items-center justify-between gap-3">
		<span class="text-body-sm text-muted-foreground">Theme</span>

		<ToggleGroup.Root onValueChange={handleThemeChange} type="single" value={theme}>
			{#each themeOptions as option (option.value)}
				<ToggleGroup.Item aria-label={option.label} value={String(option.value)}>
					{#if option.icon}
						{@const IconComponent = option.icon}

						<IconComponent class={ICON_CLASS_DEFAULT} />
					{/if}

					<span class="max-md:sr-only">{option.label}</span>
				</ToggleGroup.Item>
			{/each}
		</ToggleGroup.Root>
	</div>
{/if}
