<!--
	The settings fields as a phone's native inset list: switches, pickers and numbers as rows of
	one group, prompts and choices of one as groups of their own, each help text under its label.
	A change is handed on when it is made: a switch or a pick at once, typed text once it is left.
-->
<script lang="ts">
	import { Switch } from '@ggml-org/llama-ui/ui/switch';
	import { Textarea } from '@ggml-org/llama-ui/ui/textarea';
	import { Check, ChevronRight, FlaskConical, RotateCcw } from '@lucide/svelte';
	import McpLogo from '#lib/components/app/mcp/McpLogo.svelte';
	import NativeSelect from '#lib/components/app/misc/NativeSelect.svelte';
	import {
		INSET_GROUP_CAPTION_CLASS,
		INSET_GROUP_CLASS,
		INSET_GROUP_TITLE_CLASS,
		INSET_ROW_BODY_CLASS,
		INSET_ROW_CLASS,
		NUMERIC_FIELDS,
		SETTING_CONFIG_INFO,
		SETTINGS_KEYS
	} from '#lib/constants/index.ts';
	import { SettingsFieldType } from '#lib/enums/settings.enums.ts';
	import { modelsStore, serverStore, settingsStore, uiStore } from '#lib/stores/index.ts';
	import { normalizeFloatingPoint } from '#lib/utils/precision.ts';

	interface Props {
		/** The subgroup's title, shown above its first group of rows. */
		title?: string;
		fields: SettingsFieldConfig[];
		localConfig: SettingsConfigType;
		onConfigChange: (key: string, value: string | boolean) => void;
		/** Opens the MCP servers as a page of the sheet; without it, they open in their dialog */
		onManageMcpServers?: () => void;
		onThemeChange?: (theme: string) => void;
	}

	let { fields, localConfig, onConfigChange, onManageMcpServers, onThemeChange, title }: Props =
		$props();

	/** Rows share a group; a prompt or a choice of one gets a group of its own. */
	type Block =
		| { fields: SettingsFieldConfig[]; kind: 'rows' }
		| { field: SettingsFieldConfig; kind: 'own' };

	let visibleFields = $derived(
		fields.filter((field) => !field.dependsOn || Boolean(localConfig[field.dependsOn]))
	);

	let blocks = $derived.by(() => {
		const result: Block[] = [];

		for (const field of visibleFields) {
			const ownGroup =
				field.type === SettingsFieldType.TEXTAREA ||
				field.type === SettingsFieldType.RADIO ||
				(field.type === SettingsFieldType.INPUT && !isNumeric(field));

			if (ownGroup) {
				result.push({ field, kind: 'own' });

				continue;
			}

			const last = result[result.length - 1];

			if (last?.kind === 'rows') last.fields.push(field);
			else result.push({ fields: [field], kind: 'rows' });
		}

		return result;
	});

	// discover needs the hub metadata reads, and opens from the Models page, so both are read-only while it is on
	let discoverOn = $derived(Boolean(localConfig[SETTINGS_KEYS.ENABLE_DISCOVER_MODELS]));

	function isLockedField(key: string): boolean {
		return (
			discoverOn &&
			(key === SETTINGS_KEYS.USE_HUGGING_FACE_HUB || key === SETTINGS_KEYS.SHOW_MODELS_MANAGER)
		);
	}

	function isNumeric(field: SettingsFieldConfig): boolean {
		return field.isPositiveInteger || NUMERIC_FIELDS.includes(field.key);
	}

	// a prompt alone in a subgroup of its own name needs the name only once
	function ownCaption(field: SettingsFieldConfig): string | null {
		return title && field.label.toLowerCase() === title.toLowerCase() ? null : field.label;
	}

	function helpOf(field: SettingsFieldConfig): string | undefined {
		return field.help || SETTING_CONFIG_INFO[field.key] || undefined;
	}

	let currentModelParams = $derived.by(() => {
		void modelsStore.props.cacheVersion;

		if (serverStore.isRouterMode) {
			const currentModelName = modelsStore.selectedModelName;

			if (currentModelName) {
				const currentModelProps = modelsStore.props.getModelProps(currentModelName);

				return (currentModelProps?.default_generation_settings?.params ?? {}) as Record<
					string,
					unknown
				>;
			}
		}

		return (serverStore.defaultParams ?? {}) as Record<string, unknown>;
	});

	/** A value set apart from the server's default for the loaded model. */
	function isCustom(field: SettingsFieldConfig): boolean {
		const serverDefault = currentModelParams[field.key];
		const value = localConfig[field.key];

		if (serverDefault == null || value === '' || value === undefined) return false;

		if (field.type === SettingsFieldType.SELECT) return value !== serverDefault;

		const numeric = parseFloat(String(value));
		const normalizedValue = isNaN(numeric) ? value : Math.round(numeric * 1e6) / 1e6;
		const normalizedDefault =
			typeof serverDefault === 'number' ? Math.round(serverDefault * 1e6) / 1e6 : serverDefault;

		return normalizedValue !== normalizedDefault;
	}

	function resetToDefault(key: string) {
		settingsStore.resetParameterToServerDefault(key);
		onConfigChange(key, '');
	}
</script>

{#if blocks.length > 0}
	<div class="flex flex-col gap-1.5">
		{#if title}
			<h3 class={INSET_GROUP_TITLE_CLASS}>{title}</h3>
		{/if}

		<div class="flex flex-col gap-6">
			{#each blocks as block, index (block.kind === 'own' ? block.field.key : `rows-${index}`)}
				{#if block.kind === 'rows'}
					<section class={INSET_GROUP_CLASS}>
						{#each block.fields as field (field.key)}
							{#if field.type === SettingsFieldType.CHECKBOX}
								{@render switchRow(field)}
							{:else if field.type === SettingsFieldType.SELECT}
								{@render selectRow(field)}
							{:else}
								{@render numberRow(field)}
							{/if}

							{#if field.key === SETTINGS_KEYS.ENABLE_MCP && Boolean(localConfig[field.key])}
								<button
									class={INSET_ROW_CLASS}
									onclick={() =>
										onManageMcpServers ? onManageMcpServers() : uiStore.openMcpServers()}
									type="button"
								>
									<McpLogo class="size-icon-md shrink-0" />

									<span class={INSET_ROW_BODY_CLASS}>
										<span class="flex-1">Manage MCP servers</span>

										<ChevronRight class="size-4 shrink-0 text-muted-foreground" />
									</span>
								</button>
							{/if}
						{/each}
					</section>
				{:else}
					{@const field = block.field}
					{@const help = helpOf(field)}
					{@const showCaption = index > 0 || ownCaption(field) !== null}

					<div class="flex flex-col gap-1.5">
						{#if showCaption}
							<h3
								class="{title
									? INSET_GROUP_CAPTION_CLASS
									: INSET_GROUP_TITLE_CLASS} flex items-center gap-1.5"
							>
								{field.label}

								{#if field.isExperimental}
									<FlaskConical class="size-icon-sm" />
								{/if}
							</h3>
						{/if}

						<section class={INSET_GROUP_CLASS}>
							{#if field.type === SettingsFieldType.TEXTAREA}
								<Textarea
									aria-label={field.label}
									class="min-h-32 resize-none rounded-none border-0! bg-transparent! px-4 py-3 text-body shadow-none! focus-visible:ring-0 dark:bg-transparent!"
									onchange={(e) => onConfigChange(field.key, e.currentTarget.value)}
									placeholder={field.placeholder ?? ''}
									value={String(localConfig[field.key] ?? '')}
								/>

								{#if field.key === SETTINGS_KEYS.SYSTEM_MESSAGE}
									<label class="{INSET_ROW_CLASS} cursor-pointer">
										<span class="{INSET_ROW_BODY_CLASS} gap-4 py-3">
											<span class="flex-1">Show system message in conversations</span>

											<Switch
												checked={Boolean(localConfig.showSystemMessage)}
												onCheckedChange={(checked) =>
													onConfigChange(SETTINGS_KEYS.SHOW_SYSTEM_MESSAGE, checked)}
												size="lg"
											/>
										</span>
									</label>
								{/if}
							{:else if field.type === SettingsFieldType.RADIO && field.radioOptions}
								{@const radioOptions = field.radioOptions}
								{@const currentMode =
									radioOptions.find((option: { key: string; value: string }) =>
										Boolean(localConfig[option.key])
									)?.value ?? radioOptions[0].value}

								{#each radioOptions as option (option.value)}
									<button
										aria-pressed={option.value === currentMode}
										class={INSET_ROW_CLASS}
										onclick={() => {
											for (const opt of radioOptions)
												onConfigChange(opt.key, opt.value === option.value);
										}}
										type="button"
									>
										<!-- an option's name can run to two lines, so the row grows with it -->
										<span class="{INSET_ROW_BODY_CLASS} gap-4 py-3">
											<span class="flex flex-1 items-center gap-1.5 leading-snug">
												{option.label}

												{#if option.isExperimental}
													<FlaskConical class="size-icon-sm text-muted-foreground" />
												{/if}
											</span>

											{#if option.value === currentMode}
												<Check class="size-4 text-(--action-primary)" />
											{/if}
										</span>
									</button>
								{/each}
							{:else}
								<!-- text: a key, a name, a language; typed on a line of its own -->
								<input
									aria-label={field.label}
									autocomplete={field.isPrivate ? 'new-password' : 'off'}
									class="min-h-12 w-full border-0 bg-transparent px-4 text-body shadow-none outline-none placeholder:text-muted-foreground focus:ring-0"
									onchange={(e) => onConfigChange(field.key, e.currentTarget.value)}
									placeholder={field.placeholder ?? ''}
									type={field.isPrivate ? 'password' : 'text'}
									value={String(localConfig[field.key] ?? '')}
								/>
							{/if}
						</section>

						{#if help}
							<!-- eslint-disable-next-line svelte/no-at-html-tags -- help text comes from the settings registry -->
							<p class={INSET_GROUP_CAPTION_CLASS}>{@html help}</p>
						{/if}
					</div>
				{/if}
			{/each}
		</div>
	</div>
{/if}

{#snippet rowLabel(field: SettingsFieldConfig, help: string | undefined)}
	<span class="flex min-w-0 flex-1 flex-col gap-0.5 py-3">
		<span class="flex items-center gap-1.5">
			{field.label}

			{#if field.isExperimental}
				<FlaskConical class="size-icon-sm shrink-0 text-muted-foreground" />
			{/if}
		</span>

		{#if help}
			<!-- eslint-disable-next-line svelte/no-at-html-tags -- help text comes from the settings registry -->
			<span class="text-caption text-muted-foreground">{@html help}</span>
		{/if}
	</span>
{/snippet}

{#snippet switchRow(field: SettingsFieldConfig)}
	{@const locked = isLockedField(field.key)}

	<label class="{INSET_ROW_CLASS} {locked ? 'opacity-60' : 'cursor-pointer'}">
		<span class="{INSET_ROW_BODY_CLASS} gap-4 {field.dependsOn ? 'pl-4' : ''}">
			{@render rowLabel(field, helpOf(field))}

			<Switch
				checked={Boolean(localConfig[field.key])}
				disabled={locked}
				onCheckedChange={(checked) => onConfigChange(field.key, checked)}
				size="lg"
			/>
		</span>
	</label>
{/snippet}

{#snippet selectRow(field: SettingsFieldConfig)}
	<div class={INSET_ROW_CLASS}>
		<span class="{INSET_ROW_BODY_CLASS} gap-4">
			{@render rowLabel(field, helpOf(field))}

			<NativeSelect
				label={field.label}
				onValueChange={(value) => {
					if (field.key === SETTINGS_KEYS.THEME && value && onThemeChange) onThemeChange(value);
					else onConfigChange(field.key, value);
				}}
				options={(field.options ?? []).map((option: { value: string; label: string }) => ({
					label: option.label,
					value: option.value
				}))}
				value={String(localConfig[field.key] ?? '')}
				variant="inset"
			/>
		</span>
	</div>
{/snippet}

{#snippet numberRow(field: SettingsFieldConfig)}
	{@const custom = isCustom(field)}
	{@const serverDefault = currentModelParams[field.key]}

	<div class={INSET_ROW_CLASS}>
		<span class="{INSET_ROW_BODY_CLASS} gap-3">
			{@render rowLabel(field, helpOf(field))}

			{#if custom}
				<button
					aria-label="Reset {field.label} to default"
					class="flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground active:bg-(--surface-pressed)"
					onclick={() => resetToDefault(field.key)}
					type="button"
				>
					<RotateCcw class="size-3.5" />
				</button>
			{/if}

			<!-- 16px at least, or iOS zooms the page in on focus -->
			<input
				aria-label={field.label}
				autocomplete="off"
				class="h-9 w-20 shrink-0 rounded-lg border-0 bg-(--surface-muted) px-2.5 text-right text-body tabular-nums shadow-none outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-(--line-focus) {custom
					? 'text-foreground'
					: ''}"
				inputmode="decimal"
				onchange={(e) => onConfigChange(field.key, e.currentTarget.value)}
				placeholder={serverDefault != null
					? String(normalizeFloatingPoint(serverDefault))
					: (field.placeholder ?? '')}
				type="text"
				value={String(localConfig[field.key] ?? '')}
			/>
		</span>
	</div>
{/snippet}
