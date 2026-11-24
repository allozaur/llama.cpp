<!--
	A phone's settings: a full-height sheet. Its first page has the theme and a row per section; a row
	pushes the section's page, whose rows push its advanced settings and the tools. A change applies as
	it is made, the native way, so there is nothing to save.
-->
<script lang="ts">
	import SettingsSheetTools, {
		type SettingsToolsView,
		toolDisplay
	} from './SettingsSheetTools.svelte';
	import * as AlertDialog from '@ggml-org/llama-ui/ui/alert-dialog';
	import * as Drawer from '@ggml-org/llama-ui/ui/drawer';
	import {
		ChevronLeft,
		ChevronRight,
		PencilRuler,
		RefreshCw,
		RotateCcw,
		SlidersHorizontal,
		X
	} from '@lucide/svelte';
	import {
		SettingsChatFieldsInset,
		SettingsChatImportExportTab,
		SettingsChatVoiceTab
	} from '#lib/components/app/settings/index.ts';
	import {
		ICON_CLASS_DEFAULT,
		INSET_GROUP_CAPTION_CLASS,
		INSET_GROUP_CLASS,
		INSET_GROUP_TITLE_CLASS,
		INSET_ROW_BODY_CLASS,
		INSET_ROW_CLASS,
		NUMERIC_FIELDS,
		POSITIVE_INTEGER_FIELDS,
		SETTINGS_CHAT_SECTIONS,
		SETTINGS_KEYS,
		SETTINGS_SECTION_SLUGS,
		SHEET_HEADER_BUTTON_CLASS
	} from '#lib/constants/index.ts';
	import { ColorMode } from '#lib/enums/ui.enums.ts';
	import { useSheetPages } from '#lib/hooks/use-sheet-pages.svelte.ts';
	import { useToolsPanel } from '#lib/hooks/use-tools-panel.svelte.ts';
	import {
		deviceStore,
		modelsStore,
		serverStore,
		settingsStore,
		toolsStore
	} from '#lib/stores/index.ts';
	import { groupSettingsFields, isApiKeyFieldShown, isSettingShownOn } from '#lib/utils/index.ts';
	import { page as appPage } from '$app/state';
	import { setMode } from 'mode-watcher';
	import { tick } from 'svelte';
	import { toast } from 'svelte-sonner';

	interface Props {
		open?: boolean;
	}

	let { open = $bindable(false) }: Props = $props();

	type Page =
		| { id: 'root' }
		| { id: 'section'; slug: string }
		| { id: 'advanced'; slug: string }
		| SettingsToolsView;

	const pages = useSheetPages<Page>({ id: 'root' });
	const { transition: pageTransition } = pages;
	const page = $derived(pages.page);
	const pageKey = $derived(JSON.stringify(page));

	const toolsPanel = useToolsPanel();

	let config = $derived(settingsStore.config);
	let showResetDialog = $state(false);

	const THEMES = [
		{ label: 'Light', value: ColorMode.LIGHT },
		{ label: 'Dark', value: ColorMode.DARK },
		{ label: 'System', value: ColorMode.SYSTEM }
	];

	let section = $derived(
		page.id === 'section' || page.id === 'advanced'
			? SETTINGS_CHAT_SECTIONS.find((s) => s.slug === page.slug)
			: undefined
	);

	let showApiKey = $derived(
		isApiKeyFieldShown({
			draftKey: config[SETTINGS_KEYS.API_KEY],
			status: appPage.status,
			storedKey: config[SETTINGS_KEYS.API_KEY]
		})
	);

	// the theme has the first page's tiles, so a section does not list it again
	let sectionFields = $derived(
		(section?.fields ?? []).filter(
			(field) =>
				field.key !== SETTINGS_KEYS.THEME &&
				(field.key !== SETTINGS_KEYS.API_KEY || showApiKey) &&
				isSettingShownOn(field, deviceStore.isMobile)
		)
	);
	let basicFields = $derived(sectionFields.filter((field) => !field.advanced));
	let advancedFields = $derived(sectionFields.filter((field) => field.advanced));

	let allTools = $derived(toolsStore.toolGroups.flatMap((group) => group.tools));

	const title = $derived.by(() => {
		switch (page.id) {
			case 'section':
				return section?.title ?? 'Settings';
			case 'advanced':
				return 'Advanced';
			case 'tools':
				return 'Tools';
			case 'tool-group':
				return toolsStore.toolGroups.find((g) => g.key === page.groupKey)?.label ?? 'Tools';
			case 'tool': {
				const entry = allTools.find((t) => t.key === page.toolKey);

				return entry ? toolDisplay(entry).label : 'Tool';
			}
			default:
				return 'Settings';
		}
	});

	// a section's number fields show the server's defaults, which a router reads off its models
	let fetchInitiated = false;

	$effect(() => {
		if (open && serverStore.isRouterMode && section?.fields?.length && !fetchInitiated) {
			fetchInitiated = true;

			void modelsStore
				.fetch()
				.then(() => modelsStore.fetchRouterModels())
				.then(() => modelsStore.props.fetchModalitiesForLoadedModels())
				.then(() => modelsStore.ensureFirstModelSelected());
		}
	});

	let scrollEl = $state<HTMLDivElement>();
	// where each page below the top one was scrolled, to come back to it
	let scrollStack: number[] = [];

	// each opening starts on the first page
	$effect(() => {
		if (open) {
			pages.reset();
			scrollStack = [];
		}
	});

	function scrollTo(top: number) {
		void tick().then(() => scrollEl?.scrollTo({ top }));
	}

	// a pushed page starts at its top, and back returns to where the page below was left
	function openPage(next: Page) {
		if (next.id === 'tools') toolsPanel.handleOpen();

		scrollStack.push(scrollEl?.scrollTop ?? 0);
		pages.push(next);
		scrollTo(0);
	}

	function goBack() {
		pages.pop();
		scrollTo(scrollStack.pop() ?? 0);
	}

	function labelOf(key: string): string {
		return (
			SETTINGS_CHAT_SECTIONS.flatMap((s) => s.fields ?? []).find((f) => f.key === key)?.label ?? key
		);
	}

	/** Saves one change as it is made, checked and coupled as the desktop's Save does it. */
	function commit(key: string, value: string | boolean) {
		const updates: Record<string, string | number | boolean> = { [key]: value };

		if (key === SETTINGS_KEYS.CUSTOM_JSON && typeof value === 'string' && value.trim()) {
			try {
				JSON.parse(value);
			} catch {
				toast.error('Custom JSON is not valid JSON, so it was not saved');

				return;
			}
		}

		if (NUMERIC_FIELDS.includes(key) && value !== '') {
			const numeric = Number(value);

			if (isNaN(numeric)) {
				toast.error(`${labelOf(key)} needs a number`);

				return;
			}

			if (POSITIVE_INTEGER_FIELDS.includes(key)) {
				const field = SETTINGS_CHAT_SECTIONS.flatMap((s) => s.fields ?? []).find(
					(f) => f.key === key
				);

				updates[key] = Math.max(
					field?.min ?? 1,
					Math.min(field?.max ?? Number.POSITIVE_INFINITY, Math.round(numeric))
				);
			} else {
				updates[key] = numeric;
			}
		}

		// discover needs the hub metadata reads and opens from the Models page, as on the desktop
		if (key === SETTINGS_KEYS.ENABLE_DISCOVER_MODELS) {
			updates[SETTINGS_KEYS.USE_HUGGING_FACE_HUB] = value === true;

			if (value === true) updates[SETTINGS_KEYS.SHOW_MODELS_MANAGER] = true;
		}

		settingsStore.updateMultipleConfig(updates);
	}

	function setTheme(theme: string) {
		settingsStore.updateTheme(theme);
	}

	function handleConfirmReset() {
		settingsStore.forceSyncWithServerDefaults();
		setMode(settingsStore.config.theme as ColorMode);
		showResetDialog = false;
		toast.success('Settings reset to their defaults');
	}
</script>

<!-- full width over the sidebar, so it does not read as part of the page slid aside -->
<Drawer.Root bind:open shouldScaleBackground={false}>
	<Drawer.Content
		class="gap-0 overflow-hidden data-[vaul-drawer-direction=bottom]:h-[calc(100dvh-var(--corner-control-top))] data-[vaul-drawer-direction=bottom]:max-h-none [&>div:first-child]:relative [&>div:first-child]:z-20"
	>
		<!-- over the page, which scrolls under it; the drag handle stays above it -->
		<header
			class="pointer-events-none absolute inset-x-0 top-0 isolate z-10 grid grid-cols-[3rem_1fr_3rem] items-center px-3 pt-5.5 pb-8 *:pointer-events-auto"
		>
			<!-- the sheet's surface, blurred over what scrolls beneath, fading out below the title -->
			<div
				aria-hidden="true"
				class="pointer-events-none! absolute inset-0 -z-10 bg-(--float-panel-background) backdrop-blur-xl mask-[linear-gradient(to_bottom,black_60%,transparent)]"
			></div>

			{#if pages.canGoBack}
				<button aria-label="Back" class={SHEET_HEADER_BUTTON_CLASS} onclick={goBack} type="button">
					<ChevronLeft class="size-5" />
				</button>
			{:else}
				<Drawer.Close aria-label="Close" class={SHEET_HEADER_BUTTON_CLASS}>
					<X class={ICON_CLASS_DEFAULT} />
				</Drawer.Close>
			{/if}

			<Drawer.Title class="col-start-2 truncate text-center text-body font-semibold"
				>{title}</Drawer.Title
			>
		</header>

		<Drawer.Description class="sr-only"
			>How the app looks, chats and talks to the server.</Drawer.Description
		>

		<div
			bind:this={scrollEl}
			class="grid min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain"
		>
			{#key pageKey}
				<div
					in:pageTransition={{ incoming: true }}
					out:pageTransition={{ incoming: false }}
					class="col-start-1 row-start-1 flex min-w-0 flex-col gap-8 px-4 pt-10 pb-[max(1.5rem,var(--safe-area-bottom))]"
				>
					{#if page.id === 'root'}
						{@render rootPage()}
					{:else if page.id === 'section' && section}
						{@render sectionPage()}
					{:else if page.id === 'advanced'}
						{@render fieldGroups(advancedFields)}
					{:else if page.id === 'tools' || page.id === 'tool-group' || page.id === 'tool'}
						<SettingsSheetTools onOpen={openPage} view={page} />
					{/if}
				</div>
			{/key}
		</div>
	</Drawer.Content>
</Drawer.Root>

<AlertDialog.Root bind:open={showResetDialog}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>Reset Settings to Default</AlertDialog.Title>

			<AlertDialog.Description>
				All settings go back to their default values: the server's /props values where it has them.
				Your conversations are kept.
			</AlertDialog.Description>
		</AlertDialog.Header>

		<AlertDialog.Footer>
			<AlertDialog.Cancel>Cancel</AlertDialog.Cancel>

			<AlertDialog.Action onclick={handleConfirmReset}>Reset to Default</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>

{#snippet rootPage()}
	<div class="flex flex-col gap-1.5">
		<h3 class={INSET_GROUP_TITLE_CLASS}>Appearance</h3>

		<section class="{INSET_GROUP_CLASS} grid grid-cols-3 gap-3 p-3">
			{#each THEMES as theme (theme.value)}
				{@const selected = config.theme === theme.value}

				<button
					aria-pressed={selected}
					class="flex flex-col items-center gap-2"
					onclick={() => setTheme(theme.value)}
					type="button"
				>
					<span
						class="relative block aspect-[4/3] w-full overflow-hidden rounded-xl border border-border/60 {selected
							? 'ring-2 ring-(--action-primary) ring-offset-2 ring-offset-background'
							: ''}"
					>
						{#if theme.value === ColorMode.SYSTEM}
							<span class="absolute inset-0 bg-neutral-50"></span>

							<span
								class="absolute inset-0 bg-neutral-900 [clip-path:polygon(100%_0,100%_100%,0_100%)]"
							></span>
						{:else}
							<span
								class="absolute inset-0 {theme.value === ColorMode.DARK
									? 'bg-neutral-900'
									: 'bg-neutral-50'}"
							></span>
						{/if}

						<span
							class="absolute top-2.5 left-2.5 h-1 w-1/2 rounded-full {theme.value ===
							ColorMode.DARK
								? 'bg-neutral-600'
								: 'bg-neutral-300'}"
						></span>

						<span
							class="absolute top-5 left-2.5 h-1 w-1/3 rounded-full {theme.value === ColorMode.DARK
								? 'bg-neutral-700'
								: 'bg-neutral-200'}"
						></span>
					</span>

					<span class="text-caption {selected ? 'text-foreground' : 'text-muted-foreground'}">
						{theme.label}
					</span>
				</button>
			{/each}
		</section>
	</div>

	<section class={INSET_GROUP_CLASS}>
		{#each SETTINGS_CHAT_SECTIONS as entry (entry.slug)}
			<button
				class={INSET_ROW_CLASS}
				onclick={() => openPage({ id: 'section', slug: entry.slug })}
				type="button"
			>
				<entry.icon class="{ICON_CLASS_DEFAULT} shrink-0" />

				<span class={INSET_ROW_BODY_CLASS}>
					<span class="flex-1">{entry.title}</span>

					<ChevronRight class="size-4 shrink-0 text-muted-foreground" />
				</span>
			</button>
		{/each}
	</section>

	<p class="{INSET_GROUP_CAPTION_CLASS} -mt-6">Settings are saved in this browser.</p>
{/snippet}

{#snippet fieldGroups(fields: SettingsFieldConfig[])}
	{#each groupSettingsFields(fields) as group (group.title)}
		<SettingsChatFieldsInset
			fields={group.fields}
			localConfig={config}
			onConfigChange={commit}
			onThemeChange={setTheme}
			title={group.title}
		/>
	{/each}
{/snippet}

{#snippet navRow(Icon: typeof PencilRuler, label: string, onclick: () => void)}
	<section class={INSET_GROUP_CLASS}>
		<button class={INSET_ROW_CLASS} {onclick} type="button">
			<Icon class="{ICON_CLASS_DEFAULT} shrink-0" />

			<span class={INSET_ROW_BODY_CLASS}>
				<span class="flex-1">{label}</span>

				<ChevronRight class="size-4 shrink-0 text-muted-foreground" />
			</span>
		</button>
	</section>
{/snippet}

{#snippet sectionPage()}
	{#if section?.slug === SETTINGS_SECTION_SLUGS.DATA}
		<SettingsChatImportExportTab inset />

		<div class="flex flex-col gap-1.5">
			<h3 class={INSET_GROUP_TITLE_CLASS}>App</h3>

			<section class={INSET_GROUP_CLASS}>
				<button class={INSET_ROW_CLASS} onclick={() => window.location.reload()} type="button">
					<RefreshCw class="{ICON_CLASS_DEFAULT} shrink-0" />

					<span class={INSET_ROW_BODY_CLASS}>Reload app</span>
				</button>

				{#if settingsStore.hasCustomSettings}
					<button class={INSET_ROW_CLASS} onclick={() => (showResetDialog = true)} type="button">
						<RotateCcw class="{ICON_CLASS_DEFAULT} shrink-0 text-destructive" />

						<span class="{INSET_ROW_BODY_CLASS} text-destructive">Reset settings to default</span>
					</button>
				{/if}
			</section>
		</div>
	{:else}
		{#if section?.slug === SETTINGS_SECTION_SLUGS.AGENT}
			{@render navRow(PencilRuler, 'Tools', () => openPage({ id: 'tools' }))}
		{/if}

		{#if section?.slug === SETTINGS_SECTION_SLUGS.VOICE}
			<SettingsChatVoiceTab
				fields={basicFields}
				inset
				localConfig={config}
				onConfigChange={commit}
			/>
		{:else}
			{@render fieldGroups(basicFields)}
		{/if}

		{#if advancedFields.length > 0 && section}
			{@const slug = section.slug}
			{@render navRow(SlidersHorizontal, 'Advanced', () => openPage({ id: 'advanced', slug }))}
		{/if}
	{/if}
{/snippet}
