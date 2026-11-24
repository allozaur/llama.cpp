<!--
	Voice section of the settings: the registry's fields in their subgroups, with the microphone and the transcription model pickers.
	Those list this device's microphones and the server's models with audio input, which a static field cannot, so they
	are drawn here.
-->
<script lang="ts">
	import { Label } from '@ggml-org/llama-ui/ui/label';
	import * as Select from '@ggml-org/llama-ui/ui/select';
	import {
		listMicrophones,
		type Microphone,
		VOICE_MICROPHONE_AUTO,
		VOICE_MICROPHONE_DEFAULT
	} from '@ggml-org/llama-voice';
	import { ChevronsUpDown } from '@lucide/svelte';
	import {
		SettingsChatFields,
		SettingsChatFieldsInset,
		SettingsGroup
	} from '#lib/components/app/settings/index.ts';
	import {
		INSET_GROUP_CAPTION_CLASS,
		INSET_GROUP_CLASS,
		INSET_GROUP_TITLE_CLASS,
		INSET_ROW_BODY_CLASS,
		INSET_ROW_CLASS,
		SETTING_CONFIG_INFO,
		SETTINGS_KEYS,
		SETTINGS_REGISTRY,
		VOICE_GGUF_EXTENSION_PATTERN,
		VOICE_SETTINGS_LABEL,
		VOICE_TRANSCRIPTION_MODEL_AUTO
	} from '#lib/constants/index.ts';
	import { modelsStore, serverStore } from '#lib/stores/index.ts';
	import { groupSettingsFields } from '#lib/utils/index.ts';
	import { isTranscriptionOnlyModel } from '#lib/utils/voice-mode.ts';
	import { onMount } from 'svelte';

	interface Props {
		fields: SettingsFieldConfig[];
		/** Draw the section as a phone's inset list, for the settings sheet. */
		inset?: boolean;
		localConfig: SettingsConfigType;
		onConfigChange: (key: string, value: string | boolean) => void;
	}

	let { fields, inset = false, localConfig, onConfigChange }: Props = $props();

	const KEY = SETTINGS_KEYS.VOICE_TRANSCRIPTION_MODEL;

	let groups = $derived(groupSettingsFields(fields));

	// the pickers have no standalone field, so their registry entries say which subgroup they go in
	function groupOf(key: string): string | undefined {
		return SETTINGS_REGISTRY.flatMap((section) => section.settings).find((s) => s.key === key)
			?.group;
	}

	// the model picker goes right after Voice input, the microphone picker opens its subgroup
	function splitAt(group: SettingsFieldConfig[]): number {
		return group.findIndex((f) => f.key === SETTINGS_KEYS.VOICE_INPUT_MODE) + 1;
	}
	let isRouter = $derived(serverStore.isRouterMode);
	let current = $derived(String(localConfig[KEY] ?? VOICE_TRANSCRIPTION_MODEL_AUTO));

	let audioModels = $derived.by(() => {
		void modelsStore.props.cacheVersion;

		return modelsStore
			.getVisibleModels()
			.filter((option) => modelsStore.props.modelSupportsAudio(option.model));
	});

	let options = $derived.by(() => {
		const list = audioModels.map((option) => ({ label: option.name, value: option.model }));

		// a model picked earlier that the server no longer lists stays visible as the choice
		if (current && !list.some((option) => option.value === current)) {
			list.push({ label: current, value: current });
		}

		return [
			{ label: VOICE_SETTINGS_LABEL.automatic, value: VOICE_TRANSCRIPTION_MODEL_AUTO },
			...list
		];
	});

	// speech-to-text models first: they are made for dictation, the chat models that hear can do it too
	let optionGroups = $derived.by(() => {
		const models = options.filter((option) => option.value !== VOICE_TRANSCRIPTION_MODEL_AUTO);

		return [
			{
				heading: VOICE_SETTINGS_LABEL.speechToText,
				items: models.filter((option) => isTranscriptionOnlyModel(option.value))
			},
			{
				heading: VOICE_SETTINGS_LABEL.chatModels,
				items: models.filter((option) => !isTranscriptionOnlyModel(option.value))
			}
		].filter((group) => group.items.length > 0);
	});

	let selectedLabel = $derived(
		options.find((option) => option.value === current)?.label ?? VOICE_SETTINGS_LABEL.automatic
	);

	const MIC_KEY = SETTINGS_KEYS.VOICE_MICROPHONE;

	let microphones = $state<Microphone[]>([]);
	let micCurrent = $derived(String(localConfig[MIC_KEY] ?? VOICE_MICROPHONE_AUTO));
	// the browser names its microphones only once the page may use one
	let micNamesHidden = $derived(microphones.some((mic) => !mic.label));
	let micOptions = $derived.by(() => {
		const list = microphones.map((mic, index) => ({
			label: mic.label || VOICE_SETTINGS_LABEL.microphone(index + 1),
			value: mic.deviceId
		}));
		const fixed = [VOICE_MICROPHONE_AUTO, VOICE_MICROPHONE_DEFAULT];

		// a microphone picked earlier that is not plugged in now stays visible as the choice
		if (!fixed.includes(micCurrent) && !list.some((option) => option.value === micCurrent)) {
			list.push({ label: VOICE_SETTINGS_LABEL.disconnectedMicrophone, value: micCurrent });
		}

		return [
			{ label: VOICE_SETTINGS_LABEL.automatic, value: VOICE_MICROPHONE_AUTO },
			{ label: VOICE_SETTINGS_LABEL.systemDefault, value: VOICE_MICROPHONE_DEFAULT },
			...list.filter((option) => option.value)
		];
	});
	let micLabel = $derived(
		micOptions.find((option) => option.value === micCurrent)?.label ??
			VOICE_SETTINGS_LABEL.automatic
	);

	onMount(() => {
		const devices = navigator.mediaDevices;
		const refresh = () => {
			listMicrophones().then(
				(list) => (microphones = list),
				() => (microphones = [])
			);
		};

		refresh();
		devices?.addEventListener('devicechange', refresh);

		return () => devices?.removeEventListener('devicechange', refresh);
	});

	let singleModelId = $derived(modelsStore.activeModelId);
	// the file's name, not the GGUF path a single-model server reports
	let singleModel = $derived(
		singleModelId
			? (singleModelId.split('/').pop() ?? singleModelId).replace(VOICE_GGUF_EXTENSION_PATTERN, '')
			: null
	);
	let singleModelHasAudio = $derived(
		singleModelId ? modelsStore.props.modelSupportsAudio(singleModelId) : false
	);
</script>

{#snippet microphonePicker()}
	<div class="space-y-2" data-slot="voice-microphone">
		<Label class="text-label" for={MIC_KEY}>Microphone</Label>

		<Select.Root
			onValueChange={(value) => onConfigChange(MIC_KEY, value)}
			type="single"
			value={micCurrent}
		>
			<Select.Trigger class="w-full" id={MIC_KEY}>{micLabel}</Select.Trigger>

			<Select.Content>
				{#each micOptions as option (option.value)}
					<Select.Item label={option.label} value={option.value}>{option.label}</Select.Item>
				{/each}
			</Select.Content>
		</Select.Root>

		<p class="mt-1 text-caption text-muted-foreground">{SETTING_CONFIG_INFO[MIC_KEY]}</p>

		{#if micNamesHidden}
			<p class="text-caption text-muted-foreground">
				The browser names your microphones once you have allowed one, e.g. after your first
				recording.
			</p>
		{/if}
	</div>
{/snippet}

{#snippet transcriptionModelPicker()}
	<div class="space-y-2" data-slot="voice-transcription-model">
		<Label class="text-label" for={KEY}>Transcription model</Label>

		{#if isRouter}
			<Select.Root
				onValueChange={(value) => onConfigChange(KEY, value)}
				type="single"
				value={current}
			>
				<Select.Trigger class="w-full" id={KEY}>{selectedLabel}</Select.Trigger>

				<Select.Content>
					<Select.Item
						label={VOICE_SETTINGS_LABEL.automatic}
						value={VOICE_TRANSCRIPTION_MODEL_AUTO}
					>
						{VOICE_SETTINGS_LABEL.automatic}
					</Select.Item>

					{#each optionGroups as group (group.heading)}
						<Select.Group>
							<Select.GroupHeading>{group.heading}</Select.GroupHeading>

							{#each group.items as option (option.value)}
								<Select.Item label={option.label} value={option.value}>{option.label}</Select.Item>
							{/each}
						</Select.Group>
					{/each}
				</Select.Content>
			</Select.Root>

			<p class="mt-1 text-caption text-muted-foreground">
				{SETTING_CONFIG_INFO[KEY]} Only models with audio input are listed.
			</p>

			<p class="text-caption text-muted-foreground">
				A model you pick here is loaded on the server when you dictate, alongside the chat model, if
				it isn't loaded already. A server that keeps one model at a time (<code>--models-max 1</code
				>) unloads the chat model to do it.
			</p>
		{:else}
			<p class="text-body-sm text-muted-foreground">
				{#if singleModel}
					This server runs one model, <span class="font-medium text-foreground">{singleModel}</span
					>.
					{singleModelHasAudio
						? 'It has audio input, so it transcribes your voice.'
						: 'It has no audio input, so voice input is not available on this server.'}
				{:else}
					This server runs one model, which transcribes your voice when it has audio input.
				{/if}
			</p>
		{/if}
	</div>
{/snippet}

{#snippet insetPicker(
	label: string,
	value: string,
	valueLabel: string,
	pick: (value: string) => void,
	items: Array<{ label: string; value: string }>,
	itemGroups: Array<{ heading: string; items: Array<{ label: string; value: string }> }>
)}
	<section class={INSET_GROUP_CLASS}>
		<div class={INSET_ROW_CLASS}>
			<span class="{INSET_ROW_BODY_CLASS} gap-4">
				<span class="flex-1 py-3">{label}</span>

				<Select.Root onValueChange={pick} type="single" {value}>
					<Select.Trigger
						aria-label={label}
						class="h-auto max-w-[60%] gap-1 border-0 bg-transparent px-0 text-body-sm text-muted-foreground shadow-none dark:bg-transparent [&>svg:last-child]:hidden"
					>
						<span class="truncate">{valueLabel}</span>

						<ChevronsUpDown class="size-3.5 shrink-0" />
					</Select.Trigger>

					<Select.Content align="end">
						{#each items as option (option.value)}
							<Select.Item label={option.label} value={option.value}>{option.label}</Select.Item>
						{/each}

						{#each itemGroups as group (group.heading)}
							<Select.Group>
								<Select.GroupHeading>{group.heading}</Select.GroupHeading>

								{#each group.items as option (option.value)}
									<Select.Item label={option.label} value={option.value}>{option.label}</Select.Item
									>
								{/each}
							</Select.Group>
						{/each}
					</Select.Content>
				</Select.Root>
			</span>
		</div>
	</section>
{/snippet}

{#if inset}
	<div class="flex flex-col gap-8">
		{#each groups as group (group.title)}
			{@const split = splitAt(group.fields)}

			<div class="flex flex-col gap-1.5">
				{#if group.title}
					<h3 class={INSET_GROUP_TITLE_CLASS}>{group.title}</h3>
				{/if}

				<div class="flex flex-col gap-6">
					{#if group.title === groupOf(MIC_KEY)}
						<div class="flex flex-col gap-1.5" data-slot="voice-microphone">
							{@render insetPicker(
								'Microphone',
								micCurrent,
								micLabel,
								(value) => onConfigChange(MIC_KEY, value),
								micOptions,
								[]
							)}

							<p class={INSET_GROUP_CAPTION_CLASS}>
								{SETTING_CONFIG_INFO[MIC_KEY]}

								{#if micNamesHidden}
									The browser names your microphones once you have allowed one, e.g. after your
									first recording.
								{/if}
							</p>
						</div>
					{/if}

					<SettingsChatFieldsInset
						fields={group.fields.slice(0, split)}
						{localConfig}
						{onConfigChange}
					/>

					{#if group.title === groupOf(KEY)}
						<div class="flex flex-col gap-1.5" data-slot="voice-transcription-model">
							{#if isRouter}
								{@render insetPicker(
									'Transcription model',
									current,
									selectedLabel,
									(value) => onConfigChange(KEY, value),
									[
										{ label: VOICE_SETTINGS_LABEL.automatic, value: VOICE_TRANSCRIPTION_MODEL_AUTO }
									],
									optionGroups
								)}

								<p class={INSET_GROUP_CAPTION_CLASS}>
									{SETTING_CONFIG_INFO[KEY]} Only models with audio input are listed. A model you pick
									here is loaded on the server when you dictate, if it isn't loaded already.
								</p>
							{:else}
								<p class={INSET_GROUP_CAPTION_CLASS}>
									{#if singleModel}
										This server runs one model, {singleModel}.
										{singleModelHasAudio
											? 'It has audio input, so it transcribes your voice.'
											: 'It has no audio input, so voice input is not available on this server.'}
									{:else}
										This server runs one model, which transcribes your voice when it has audio
										input.
									{/if}
								</p>
							{/if}
						</div>
					{/if}

					<SettingsChatFieldsInset
						fields={group.fields.slice(split)}
						{localConfig}
						{onConfigChange}
					/>
				</div>
			</div>
		{/each}
	</div>
{:else}
	<div class="space-y-12">
		{#each groups as group (group.title)}
			{@const split = splitAt(group.fields)}

			<SettingsGroup title={group.title}>
				<div class="space-y-6">
					{#if group.title === groupOf(MIC_KEY)}
						{@render microphonePicker()}
					{/if}

					<SettingsChatFields
						fields={group.fields.slice(0, split)}
						{localConfig}
						{onConfigChange}
					/>

					{#if group.title === groupOf(KEY)}
						{@render transcriptionModelPicker()}
					{/if}

					<SettingsChatFields fields={group.fields.slice(split)} {localConfig} {onConfigChange} />
				</div>
			</SettingsGroup>
		{/each}
	</div>
{/if}
