<!--
	A phone's model picker: a sheet in the settings sheet's patterns. It opens partway with the
	few models in reach (loaded, favorite, recent), each marked when it is the chat's or the
	dictation's, the reasoning effort and a row that opens all models as a page, in groups of the
	same rows. Tapping a model switches the chat to it, loading it if need be, as on a desktop;
	holding it opens its menu, as a held chat row does: unload it, or open its details over the
	sheet. A search
	shows its results in place; it stays at the sheet's foot.
-->
<script lang="ts">
	import ModelAvatar from '../ModelAvatar.svelte';
	import ModelId from '../ModelId.svelte';
	import ModelVoiceRole from '../ModelVoiceRole.svelte';
	import * as Drawer from '@ggml-org/llama-ui/ui/drawer';
	import {
		Check,
		ChevronLeft,
		ChevronRight,
		Info,
		Lightbulb,
		Loader2,
		Mic,
		MoreHorizontal,
		PowerOff,
		Search,
		X
	} from '@lucide/svelte';
	import DropdownMenuActions from '#lib/components/app/navigation/DropdownMenuActions.svelte';
	import {
		ICON_CLASS_DEFAULT,
		INSET_GROUP_CAPTION_CLASS,
		INSET_GROUP_CLASS,
		INSET_GROUP_TITLE_CLASS,
		INSET_ROW_BODY_CLASS,
		INSET_ROW_CLASS,
		REASONING_EFFORT_LABELS,
		ROW_LONG_PRESS_MS,
		SETTINGS_KEYS,
		SHEET_CONTENT_CLASS,
		SHEET_HEADER_BUTTON_CLASS,
		SHEET_HEADER_CLASS
	} from '#lib/constants/index.ts';
	import { useLongPress } from '#lib/hooks/use-long-press.svelte.ts';
	import { useReasoningMenu } from '#lib/hooks/use-reasoning-menu.svelte.ts';
	import { useSheetPages } from '#lib/hooks/use-sheet-pages.svelte.ts';
	import {
		modelsStore,
		serverStore,
		settingsStore,
		uiStore,
		voiceStore
	} from '#lib/stores/index.ts';
	import type { MenuAction } from '#lib/types/index.ts';
	import {
		type GroupedModelOptions,
		groupModelFamilies,
		type ModelItem
	} from '#lib/utils/index.ts';
	import { tick } from 'svelte';

	interface Props {
		/** The chat's model, marked among the rows. */
		activeId?: string | null;
		emptyMessage?: string;
		/** Favorite models, after the loaded ones on the All models page. */
		favoriteItems?: ModelItem[];
		/** The other models: grouped by family on the All models page, as the setting asks. */
		groups?: GroupedModelOptions;
		/** Hide the organization in the rows' model ids. */
		hideOrgName?: boolean;
		isEmpty?: boolean;
		/** Loaded models, leading the All models page. */
		loadedItems?: ModelItem[];
		onOpenChange?: (open: boolean) => void;
		onSearchChange?: (value: string) => void;
		onSearchKeyDown?: (event: KeyboardEvent) => void;
		/** A tapped model: switches the chat to it, loading it if need be. */
		onSelect?: (modelId: string) => void;
		open?: boolean;
		/** The few models the sheet opens with; none leaves it to the full list. */
		quickItems?: ModelItem[];
		searchTerm?: string;
		/** The chat's reasoning effort, as a row that opens its levels. */
		showReasoning?: boolean;
	}

	let {
		activeId = null,
		emptyMessage = 'No models found.',
		favoriteItems = [],
		groups = { available: [] },
		hideOrgName = false,
		isEmpty = false,
		loadedItems = [],
		onOpenChange,
		onSearchChange,
		onSearchKeyDown,
		onSelect,
		open = $bindable(false),
		quickItems = [],
		searchTerm = '',
		showReasoning = false
	}: Props = $props();

	type Page = { id: 'root' } | { id: 'all' } | { id: 'effort' };

	const pages = useSheetPages<Page>({ id: 'root' });
	const { transition: pageTransition } = pages;
	const page = $derived(pages.page);

	const reasoning = useReasoningMenu();

	let scrollEl = $state<HTMLDivElement>();

	let isSearching = $derived(searchTerm.trim().length > 0);
	// the full list: its own page, a search's results, or all there is with no quick rows
	let showFull = $derived(page.id === 'all' || isSearching || quickItems.length === 0);
	let hasEffort = $derived(showReasoning && reasoning.levels.length > 0);
	let effortLabel = $derived(REASONING_EFFORT_LABELS[reasoning.currentEffort] ?? '');

	// the models past the loaded and favorite ones: a group per family, or one for them all
	let otherGroups = $derived.by(() => {
		const items = groups.available.flatMap((group) => group.items);

		if (items.length === 0) return [];

		if (!settingsStore.config[SETTINGS_KEYS.GROUP_MODELS_BY_FAMILY]) {
			return [{ items, key: 'local', title: 'Local models' }];
		}

		return groupModelFamilies(items, (item) => item.option.model).map((family) => ({
			items: family.entries,
			key: `family-${family.key}`,
			title: family.label
		}));
	});
	let fullGroups = $derived([
		...(loadedItems.length > 0 ? [{ items: loadedItems, key: 'loaded', title: 'Loaded' }] : []),
		...(favoriteItems.length > 0
			? [{ items: favoriteItems, key: 'favorites', title: 'Favorites' }]
			: []),
		...otherGroups
	]);

	// a held row's menu, anchored to the row
	let menuItem = $state<ModelItem | null>(null);
	let menuAnchor = $state<HTMLElement | null>(null);
	let menuOpen = $state(false);
	// the row under the finger, for the hold to open its menu
	let pressed = $state<{ item: ModelItem; row: HTMLElement } | null>(null);

	const longPress = useLongPress({
		enabled: () => true,
		onLongPress: () => {
			if (!pressed) return;

			menuItem = pressed.item;
			menuAnchor = pressed.row;
			menuOpen = true;
		}
	});

	let menuActions = $derived.by((): MenuAction[] => {
		const item = menuItem;

		if (!item) return [];

		const { id, model } = item.option;
		const actions: MenuAction[] = [];

		// a router unloads its models; a lone server keeps its one model loaded
		if (serverStore.isRouterMode) {
			if (modelsStore.isModelLoading(model)) {
				actions.push({
					icon: Loader2,
					label: 'Cancel loading',
					onclick: () => void modelsStore.status.cancelLoad(model)
				});
			} else if (modelsStore.isModelLoaded(model)) {
				actions.push({
					icon: PowerOff,
					label: 'Unload',
					onclick: () => void modelsStore.status.unload(model)
				});
			}
		}

		actions.push({
			icon: Info,
			label: 'More details',
			onclick: () => uiStore.openModelDetails(id)
		});

		return actions;
	});

	// each opening starts on the first page
	$effect(() => {
		if (open) pages.reset();
	});

	function openPage(next: Page) {
		pages.push(next);
		void tick().then(() => scrollEl?.scrollTo({ top: 0 }));
	}
</script>

{#snippet modelRow(item: ModelItem)}
	{@const inChat = activeId === item.option.id}
	{@const dictates = !inChat && voiceStore.isDictationModel(item.option.model)}

	<button
		style:--row-hold-ms="{ROW_LONG_PRESS_MS}ms"
		class={[
			INSET_ROW_CLASS,
			'select-none [-webkit-touch-callout:none] [content-visibility:auto] [contain-intrinsic-size:auto_3rem]',
			// the row sinks while a finger holds it, and stays lit while its menu is open
			longPress.isPressing &&
				pressed?.item === item &&
				'bg-(--surface-pressed) duration-(--row-hold-ms) ease-out',
			menuOpen && menuItem === item && 'bg-(--surface-pressed)'
		]}
		onclick={() => onSelect?.(item.option.id)}
		onclickcapture={longPress.handleClickCapture}
		oncontextmenu={longPress.handleContextMenu}
		onpointercancel={longPress.handlePointerEnd}
		onpointerdown={(event) => {
			pressed = { item, row: event.currentTarget };
			longPress.handlePointerDown(event);
		}}
		onpointermove={longPress.handlePointerMove}
		onpointerup={longPress.handlePointerEnd}
		type="button"
	>
		<ModelAvatar class="shrink-0" option={item.option} size="size-6" />

		<span class="{INSET_ROW_BODY_CLASS} gap-3">
			<span class="flex min-w-0 flex-1 items-center gap-1.5">
				<ModelId
					class="min-w-0"
					draftSidecars={item.option.draftSidecars}
					hideCapabilities
					hideModalities
					{hideOrgName}
					modelId={item.option.model}
					tags={item.option.tags}
				/>

				<ModelVoiceRole model={item.option.model} />
			</span>

			<!-- what the model does now: the chat's, or the one that transcribes dictation -->
			{#if inChat}
				<span class="flex shrink-0 items-center gap-1 text-caption text-muted-foreground">
					In chat
					<Check class="size-4 text-(--action-primary)" />
				</span>
			{:else if dictates}
				<span class="flex shrink-0 items-center gap-1 text-caption text-muted-foreground">
					Dictation
					<Mic class="size-4 text-destructive" />
				</span>
			{/if}
		</span>
	</button>
{/snippet}

{#snippet effortRow()}
	<section class={INSET_GROUP_CLASS}>
		<button class={INSET_ROW_CLASS} onclick={() => openPage({ id: 'effort' })} type="button">
			<Lightbulb class="{ICON_CLASS_DEFAULT} shrink-0" />

			<span class={INSET_ROW_BODY_CLASS}>
				<span class="flex-1">Reasoning</span>

				<span class="text-body-sm text-muted-foreground">{effortLabel}</span>

				<ChevronRight class="size-4 shrink-0 text-muted-foreground" />
			</span>
		</button>
	</section>
{/snippet}

<!-- a held row's menu: it shows no trigger, anchored to the row as a held chat row's is -->
<div hidden>
	<DropdownMenuActions
		bind:open={menuOpen}
		actions={menuActions}
		align="center"
		anchor={menuAnchor}
		triggerIcon={MoreHorizontal}
		triggerTooltip="Model actions"
	/>
</div>

<!-- the details drawer opens over the picker: the picker stays open under its backdrop -->
<Drawer.Root bind:open {onOpenChange} shouldScaleBackground={false}>
	<Drawer.Content
		class={[
			'gap-0 overflow-hidden data-[vaul-drawer-direction=bottom]:max-h-[calc(100dvh-var(--corner-control-top))]',
			showFull
				? 'data-[vaul-drawer-direction=bottom]:h-[calc(100dvh-var(--corner-control-top))]'
				: 'data-[vaul-drawer-direction=bottom]:h-auto',
			SHEET_CONTENT_CLASS,
			uiStore.isModelDetailsOpen && 'z-40'
		]}
		onOpenAutoFocus={(event) => event.preventDefault()}
		overlayClass={uiStore.isModelDetailsOpen ? 'z-40' : undefined}
	>
		<header class="{SHEET_HEADER_CLASS} grid-cols-[3rem_1fr_3rem]">
			{#if pages.canGoBack}
				<button
					aria-label="Back"
					class={SHEET_HEADER_BUTTON_CLASS}
					onclick={pages.pop}
					type="button"
				>
					<ChevronLeft class="size-5" />
				</button>
			{:else}
				<Drawer.Close aria-label="Close" class={SHEET_HEADER_BUTTON_CLASS}>
					<X class={ICON_CLASS_DEFAULT} />
				</Drawer.Close>
			{/if}

			<Drawer.Title class="col-start-2 truncate text-center text-body font-semibold">
				{page.id === 'effort' ? 'Reasoning' : page.id === 'all' ? 'All models' : 'Select model'}
			</Drawer.Title>
		</header>

		<Drawer.Description class="sr-only">Pick the model for this chat.</Drawer.Description>

		<div
			bind:this={scrollEl}
			class="grid min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain"
		>
			{#key page.id}
				<div
					in:pageTransition={{ incoming: true }}
					out:pageTransition={{ incoming: false }}
					class="col-start-1 row-start-1 flex min-w-0 flex-col gap-6 px-4 pb-4"
				>
					{#if page.id === 'effort'}
						<div class="flex flex-col gap-1.5">
							<section class={INSET_GROUP_CLASS}>
								{#each reasoning.levels as level (level.value)}
									{@const note = reasoning.tokenLabel(level)}

									<button
										aria-pressed={reasoning.isSelected(level)}
										class={INSET_ROW_CLASS}
										onclick={() => {
											reasoning.select(level);
											pages.pop();
										}}
										type="button"
									>
										<span class="{INSET_ROW_BODY_CLASS} gap-3">
											<span class="flex-1">{level.label}</span>

											{#if note}
												<span class="text-caption text-muted-foreground">{note}</span>
											{/if}

											{#if reasoning.isSelected(level)}
												<Check class="size-4 shrink-0 text-(--action-primary)" />
											{/if}
										</span>
									</button>
								{/each}
							</section>

							<p class={INSET_GROUP_CAPTION_CLASS}>
								More reasoning means more thorough answers, but they take longer and use more of the
								context.
							</p>
						</div>
					{:else if showFull}
						{#if isEmpty}
							<p class="px-4 py-3 text-body-sm text-muted-foreground">{emptyMessage}</p>
						{:else}
							{#each fullGroups as group (group.key)}
								<div class="flex flex-col gap-1.5">
									<h3 class={INSET_GROUP_TITLE_CLASS}>{group.title}</h3>

									<section class={INSET_GROUP_CLASS}>
										{#each group.items as item (item.option.id)}
											{@render modelRow(item)}
										{/each}
									</section>
								</div>
							{/each}
						{/if}
					{:else}
						<!-- plain rows in one rounded group, as the add sheet's -->
						<section class={INSET_GROUP_CLASS}>
							{#each quickItems as item (item.option.id)}
								{@render modelRow(item)}
							{/each}
						</section>

						{#if hasEffort}
							{@render effortRow()}
						{/if}

						<section class={INSET_GROUP_CLASS}>
							<button class={INSET_ROW_CLASS} onclick={() => openPage({ id: 'all' })} type="button">
								<span class="{INSET_ROW_BODY_CLASS} border-t-0">
									<span class="flex-1">All models</span>

									<ChevronRight class="size-4 shrink-0 text-muted-foreground" />
								</span>
							</button>
						</section>
					{/if}
				</div>
			{/key}
		</div>

		{#if page.id !== 'effort'}
			<!-- the search stays at the sheet's foot; 16px, or iOS zooms in on it -->
			<div
				class="shrink-0 border-t border-border/60 px-4 pt-3 pb-[max(0.75rem,var(--safe-area-bottom))]"
			>
				<label class="flex h-11 items-center gap-2 rounded-full bg-(--surface-muted) px-4">
					<Search class="size-4 shrink-0 text-muted-foreground" />

					<input
						autocomplete="off"
						class="min-w-0 flex-1 border-0 bg-transparent p-0 text-body shadow-none outline-none placeholder:text-muted-foreground focus:ring-0"
						enterkeyhint="search"
						oninput={(event) => onSearchChange?.(event.currentTarget.value)}
						onkeydown={onSearchKeyDown}
						placeholder="Search models"
						type="search"
						value={searchTerm}
					/>
				</label>
			</div>
		{/if}
	</Drawer.Content>
</Drawer.Root>
