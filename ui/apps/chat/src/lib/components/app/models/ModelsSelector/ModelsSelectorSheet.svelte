<!--
	A phone's model picker: a sheet in the settings sheet's patterns. It opens partway with the
	few models in reach (loaded, favorite, recent), the reasoning effort and a row that opens all
	models as a page. Swiping up stretches the sheet to the top, with the same rows; a search
	shows its results in place. The search stays at the sheet's foot.
-->
<script lang="ts">
	import ModelAvatar from '../ModelAvatar.svelte';
	import ModelId from '../ModelId.svelte';
	import * as Drawer from '@ggml-org/llama-ui/ui/drawer';
	import { Check, ChevronLeft, ChevronRight, Lightbulb, Search, X } from '@lucide/svelte';
	import {
		ICON_CLASS_DEFAULT,
		INSET_GROUP_CAPTION_CLASS,
		INSET_GROUP_CLASS,
		INSET_ROW_BODY_CLASS,
		INSET_ROW_CLASS,
		REASONING_EFFORT_LABELS,
		SHEET_CONTENT_CLASS,
		SHEET_HEADER_BUTTON_CLASS,
		SHEET_HEADER_CLASS
	} from '#lib/constants/index.ts';
	import { useReasoningMenu } from '#lib/hooks/use-reasoning-menu.svelte.ts';
	import { useSheetPages } from '#lib/hooks/use-sheet-pages.svelte.ts';
	import { uiStore } from '#lib/stores/index.ts';
	import type { ModelItem } from '#lib/utils/index.ts';
	import type { Snippet } from 'svelte';
	import { tick } from 'svelte';

	interface Props {
		/** The model in use, checked among the quick rows. */
		activeId?: string | null;
		/** Every model, in its sections: the All models page and the search results. */
		children: Snippet;
		emptyMessage?: string;
		isEmpty?: boolean;
		onOpenChange?: (open: boolean) => void;
		onSearchChange?: (value: string) => void;
		onSearchKeyDown?: (event: KeyboardEvent) => void;
		open?: boolean;
		/** Hide the organization in the quick rows' model ids. */
		hideOrgName?: boolean;
		/** Picks a model from the quick rows. */
		onSelect?: (modelId: string) => void;
		/** The few models the sheet opens with; none leaves it to the full list. */
		quickItems?: ModelItem[];
		searchTerm?: string;
		/** The chat's reasoning effort, as a row that opens its levels. */
		showReasoning?: boolean;
	}

	let {
		activeId = null,
		children,
		emptyMessage = 'No models found.',
		hideOrgName = false,
		isEmpty = false,
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

	// stretched to the top of the screen, by a swipe up or the All models page
	let tall = $state(false);
	let scrollEl = $state<HTMLDivElement>();
	let touchStartY: number | null = null;

	let isSearching = $derived(searchTerm.trim().length > 0);
	// the full list: its own page, a search's results, or all there is with no quick rows
	let showFull = $derived(page.id === 'all' || isSearching || quickItems.length === 0);
	let isTall = $derived(tall || showFull);
	let hasEffort = $derived(showReasoning && reasoning.levels.length > 0);
	let effortLabel = $derived(REASONING_EFFORT_LABELS[reasoning.currentEffort] ?? '');

	// each opening starts short, on the first page
	$effect(() => {
		if (open) {
			pages.reset();
			tall = false;
		}
	});

	function openPage(next: Page) {
		pages.push(next);
		void tick().then(() => scrollEl?.scrollTo({ top: 0 }));
	}

	// a swipe or wheel upward stretches the short sheet to the top, as dragging a native sheet does
	function handleTouchStart(event: TouchEvent) {
		touchStartY = event.touches[0]?.clientY ?? null;
	}

	function handleTouchMove(event: TouchEvent) {
		if (tall || touchStartY === null) return;

		const y = event.touches[0]?.clientY ?? touchStartY;

		if (touchStartY - y > 12) tall = true;
	}

	function handleWheel(event: WheelEvent) {
		if (!tall && event.deltaY > 0) tall = true;
	}
</script>

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

<!-- the details drawer opens over the picker: the picker stays open under its backdrop -->
<Drawer.Root bind:open {onOpenChange} shouldScaleBackground={false}>
	<Drawer.Content
		class={[
			'gap-0 overflow-hidden transition-[height] duration-300 ease-sheet [interpolate-size:allow-keywords] data-[vaul-drawer-direction=bottom]:max-h-[calc(100dvh-var(--corner-control-top))]',
			isTall
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
			aria-label="Models"
			class="grid min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain"
			ontouchmove={handleTouchMove}
			ontouchstart={handleTouchStart}
			onwheel={handleWheel}
			role="region"
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
							<div class="-mx-2.5">{@render children()}</div>
						{/if}
					{:else}
						<!-- plain rows in one rounded group, as the add sheet's -->
						<section class={INSET_GROUP_CLASS}>
							{#each quickItems as item (item.option.id)}
								<button
									aria-pressed={activeId === item.option.id}
									class={INSET_ROW_CLASS}
									onclick={() => onSelect?.(item.option.id)}
									type="button"
								>
									<ModelAvatar class="shrink-0" option={item.option} size="size-6" />

									<span class="{INSET_ROW_BODY_CLASS} gap-3">
										<ModelId
											class="min-w-0 flex-1"
											hideCapabilities
											hideModalities
											{hideOrgName}
											hideQuantization
											modelId={item.option.model}
										/>

										{#if activeId === item.option.id}
											<Check class="size-4 shrink-0 text-(--action-primary)" />
										{/if}
									</span>
								</button>
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
			<!-- the search stays at the sheet's foot, short or stretched; 16px, or iOS zooms in on it -->
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
