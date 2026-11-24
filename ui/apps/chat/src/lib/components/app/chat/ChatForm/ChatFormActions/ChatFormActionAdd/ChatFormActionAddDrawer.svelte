<script lang="ts">
	import * as Drawer from '@ggml-org/llama-ui/ui/drawer';
	import { Switch } from '@ggml-org/llama-ui/ui/switch';
	import {
		Braces,
		Camera,
		ChevronLeft,
		ChevronRight,
		File,
		Folder,
		Globe,
		Info,
		Loader2,
		MessageSquare,
		PencilRuler,
		Server,
		X
	} from '@lucide/svelte';
	import {
		ATTACHMENT_FILE_ITEMS,
		ATTACHMENT_MENU_TEXT,
		ATTACHMENT_MODALITY_TEXT,
		ICON_CLASS_DEFAULT,
		INSET_GROUP_CLASS,
		INSET_ROW_BODY_CLASS,
		INSET_ROW_CLASS,
		MODALITY_ICONS,
		SHEET_HEADER_BUTTON_CLASS
	} from '#lib/constants/index.ts';
	import { getChatFormActionsContext } from '#lib/contexts/index.ts';
	import { AttachmentAction, AttachmentItemEnabledWhen } from '#lib/enums/attachment.enums.ts';
	import { ModelModality, ToolSource } from '#lib/enums/index.ts';
	import { useAttachmentMenu } from '#lib/hooks/use-attachment-menu.svelte.ts';
	import { useSheetPages } from '#lib/hooks/use-sheet-pages.svelte.ts';
	import { useToolsPanel } from '#lib/hooks/use-tools-panel.svelte.ts';
	import { toolsStore } from '#lib/stores/index.ts';
	import type { ToolGroup } from '#lib/types/index.ts';
	import type { Component, Snippet } from 'svelte';

	interface Props {
		class?: string;
		trigger: Snippet<[{ disabled: boolean; onclick?: () => void }]>;
	}

	let { class: className = '', trigger }: Props = $props();

	const chatFormActions = getChatFormActionsContext();

	/** The sheet's pages: the root menu, the tools list, and one tool group's tools. */
	type Page = { id: 'root' } | { id: 'tools' } | { groupKey: string; id: 'group' };

	let drawerOpen = $state(false);
	const pages = useSheetPages<Page>({ id: 'root' });
	const { transition: pageTransition } = pages;
	const page = $derived(pages.page);
	const pageKey = $derived(page.id === 'group' ? `group:${page.groupKey}` : page.id);

	// the root page's height, kept as the floor for the pages pushed over it so the sheet does not jump
	let rootHeight = $state(0);

	const TOOL_SOURCE_ICONS: Partial<Record<ToolSource, Component>> = {
		[ToolSource.BROWSER]: Globe,
		[ToolSource.CUSTOM]: Braces,
		[ToolSource.SERVER]: Server
	};

	let cameraInput: HTMLInputElement | undefined = $state();
	let filesInput: HTMLInputElement | undefined = $state();

	const attachmentMenu = useAttachmentMenu(
		() => ({
			hasAudioModality: chatFormActions.hasAudioModality,
			hasVideoModality: chatFormActions.hasVideoModality,
			hasVisionModality: chatFormActions.hasVisionModality
		}),
		() => ({
			onFileUpload: chatFormActions.onFileUpload,
			onSystemPromptClick: chatFormActions.onSystemPromptClick
		}),
		() => {
			drawerOpen = false;
		}
	);

	const FILE_MODALITY_ICONS: Record<string, { icon: Component; label: string }> = {
		[AttachmentItemEnabledWhen.HAS_AUDIO_MODALITY]: {
			icon: MODALITY_ICONS[ModelModality.AUDIO],
			label: ATTACHMENT_MODALITY_TEXT[AttachmentItemEnabledWhen.HAS_AUDIO_MODALITY]
		},
		[AttachmentItemEnabledWhen.HAS_VIDEO_MODALITY]: {
			icon: MODALITY_ICONS[ModelModality.VIDEO],
			label: ATTACHMENT_MODALITY_TEXT[AttachmentItemEnabledWhen.HAS_VIDEO_MODALITY]
		},
		[AttachmentItemEnabledWhen.HAS_VISION_MODALITY]: {
			icon: MODALITY_ICONS[ModelModality.VISION],
			label: ATTACHMENT_MODALITY_TEXT[AttachmentItemEnabledWhen.HAS_VISION_MODALITY]
		}
	};

	const supportedModalities = $derived.by(() =>
		ATTACHMENT_FILE_ITEMS.filter((item) => attachmentMenu.isItemEnabled(item.enabledWhen))
			.map((item) => FILE_MODALITY_ICONS[item.enabledWhen ?? ''])
			.filter((modality) => modality !== undefined)
	);

	// the sheet's own pickers keep it open while the native picker is up; it closes once files arrive
	const canPickFiles = $derived(!!chatFormActions.onFilesSelect);
	// the camera only makes sense for a model that can see what it gives
	const canUseCamera = $derived(chatFormActions.hasVisionModality && canPickFiles);

	const toolsPanel = useToolsPanel();
	const allGroups = $derived([...toolsPanel.categoryGroups, ...toolsPanel.mcpGroups]);
	const enabledToolCount = $derived(
		allGroups.reduce((n, group) => n + toolsPanel.getEnabledToolCount(group), 0)
	);
	const currentGroup = $derived(
		page.id === 'group' ? allGroups.find((group) => group.key === page.groupKey) : undefined
	);

	const title = $derived.by(() => {
		if (page.id === 'tools') return ATTACHMENT_MENU_TEXT.TOOLS;

		if (page.id === 'group') return currentGroup?.label ?? ATTACHMENT_MENU_TEXT.TOOLS;

		return ATTACHMENT_MENU_TEXT.ADD_TO_CHAT;
	});

	function open() {
		pages.reset();
		drawerOpen = true;
	}

	function push(next: Page) {
		if (next.id === 'tools') toolsPanel.handleOpen();

		pages.push(next);
	}

	function handleAddFiles() {
		if (canPickFiles) {
			filesInput?.click();
		} else {
			attachmentMenu.callbacks[AttachmentAction.FILE_UPLOAD]();
		}
	}

	function handleFilesSelect(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const files = input.files ? Array.from(input.files) : [];

		// cleared so the same file can be picked again
		input.value = '';

		if (files.length === 0) return;

		drawerOpen = false;
		chatFormActions.onFilesSelect?.(files);
	}
</script>

<!-- hidden pickers: capture opens the camera on phones, the plain input the system file picker -->
<input
	bind:this={cameraInput}
	accept="image/*"
	capture="environment"
	class="hidden"
	onchange={handleFilesSelect}
	type="file"
/>

<input bind:this={filesInput} class="hidden" multiple onchange={handleFilesSelect} type="file" />

<div class="flex items-center gap-1 {className}">
	<Drawer.Root bind:open={drawerOpen}>
		{@render trigger({ disabled: chatFormActions.disabled, onclick: open })}

		<Drawer.Content class="gap-0 data-[vaul-drawer-direction=bottom]:max-h-[85dvh]">
			<header class="grid shrink-0 grid-cols-[5.5rem_1fr_5.5rem] items-center px-3 pt-2 pb-3">
				{#if pages.canGoBack}
					<button
						aria-label={ATTACHMENT_MENU_TEXT.BACK}
						class={SHEET_HEADER_BUTTON_CLASS}
						onclick={pages.pop}
						type="button"
					>
						<ChevronLeft class="size-5" />
					</button>
				{:else}
					<Drawer.Close aria-label={ATTACHMENT_MENU_TEXT.CLOSE} class={SHEET_HEADER_BUTTON_CLASS}>
						<X class={ICON_CLASS_DEFAULT} />
					</Drawer.Close>
				{/if}

				<Drawer.Title class="truncate text-center text-body font-semibold">{title}</Drawer.Title>
			</header>

			<Drawer.Description class="sr-only">{ATTACHMENT_MENU_TEXT.DESCRIPTION}</Drawer.Description>

			<div
				style:min-height={page.id !== 'root' && rootHeight ? `${rootHeight}px` : undefined}
				class="grid min-h-0 flex-1 overflow-x-hidden overflow-y-auto"
			>
				{#key pageKey}
					<div
						bind:clientHeight={
							() => rootHeight,
							(height) => {
								if (page.id === 'root' && height) rootHeight = height;
							}
						}
						in:pageTransition={{ incoming: true }}
						out:pageTransition={{ incoming: false }}
						class="col-start-1 row-start-1 flex flex-col gap-4 px-3 pb-[max(1rem,env(safe-area-inset-bottom))]"
					>
						{#if page.id === 'root'}
							{@render rootPage()}
						{:else if page.id === 'tools'}
							{@render toolsPage()}
						{:else if currentGroup}
							{@render groupPage(currentGroup)}
						{/if}
					</div>
				{/key}
			</div>
		</Drawer.Content>
	</Drawer.Root>
</div>

{#snippet rootPage()}
	<section class={INSET_GROUP_CLASS}>
		{#if canUseCamera}
			<button class={INSET_ROW_CLASS} onclick={() => cameraInput?.click()} type="button">
				<Camera class="{ICON_CLASS_DEFAULT} shrink-0" />

				<span class={INSET_ROW_BODY_CLASS}>{ATTACHMENT_MENU_TEXT.CAMERA}</span>
			</button>
		{/if}

		<button class={INSET_ROW_CLASS} onclick={handleAddFiles} type="button">
			<File class="{ICON_CLASS_DEFAULT} shrink-0" />

			<span class={INSET_ROW_BODY_CLASS}>
				<span class="flex-1">{ATTACHMENT_MENU_TEXT.ADD_FILES}</span>

				{#if supportedModalities.length > 0}
					<span class="flex items-center gap-1 text-muted-foreground">
						{#each supportedModalities as modality (modality.label)}
							<modality.icon aria-label={modality.label} class="size-3" />
						{/each}
					</span>
				{/if}
			</span>
		</button>
	</section>

	<section class={INSET_GROUP_CLASS}>
		<button
			class={INSET_ROW_CLASS}
			onclick={() => attachmentMenu.callbacks[AttachmentAction.SYSTEM_PROMPT_CLICK]()}
			type="button"
		>
			<MessageSquare class="{ICON_CLASS_DEFAULT} shrink-0" />

			<span class={INSET_ROW_BODY_CLASS}>{ATTACHMENT_MENU_TEXT.SYSTEM_MESSAGE}</span>
		</button>

		{#if chatFormActions.onWorkingDirectoryClick}
			<button
				class={INSET_ROW_CLASS}
				onclick={() => {
					drawerOpen = false;
					chatFormActions.onWorkingDirectoryClick?.();
				}}
				type="button"
			>
				<Folder class="{ICON_CLASS_DEFAULT} shrink-0" />

				<span class={INSET_ROW_BODY_CLASS}>
					<span class="shrink-0">{ATTACHMENT_MENU_TEXT.WORKING_DIRECTORY}</span>

					<span class="min-w-0 flex-1 truncate text-right text-body-sm text-muted-foreground">
						{chatFormActions.workingDirectory ?? ATTACHMENT_MENU_TEXT.NONE}
					</span>

					<ChevronRight class="size-4 shrink-0 text-muted-foreground" />
				</span>
			</button>
		{/if}

		<button class={INSET_ROW_CLASS} onclick={() => push({ id: 'tools' })} type="button">
			<PencilRuler class="{ICON_CLASS_DEFAULT} shrink-0" />

			<span class={INSET_ROW_BODY_CLASS}>
				<span class="flex-1">{ATTACHMENT_MENU_TEXT.TOOLS}</span>

				{#if toolsPanel.totalToolCount > 0}
					<span class="text-body-sm text-muted-foreground tabular-nums">
						{enabledToolCount}/{toolsPanel.totalToolCount}
					</span>
				{/if}

				<ChevronRight class="size-4 shrink-0 text-muted-foreground" />
			</span>
		</button>
	</section>
{/snippet}

{#snippet toolsPage()}
	{#if toolsPanel.totalToolCount === 0}
		<section class="{INSET_GROUP_CLASS} px-4 py-4 text-body-sm text-muted-foreground">
			{#if toolsStore.loading}
				<span class="flex items-center justify-center gap-2">
					<Loader2 class="{ICON_CLASS_DEFAULT} animate-spin" />

					Loading tools...
				</span>
			{:else if toolsStore.error && !toolsStore.isToolsEndpointUnreachable}
				<span class="text-center">Failed to load tools</span>
			{:else}
				<span class="flex gap-2">
					<Info class="mt-0.5 {ICON_CLASS_DEFAULT} shrink-0" />

					<span>{toolsPanel.noToolsInfoMessage ?? 'No tools available'}</span>
				</span>
			{/if}
		</section>
	{:else}
		{#if toolsPanel.categoryGroups.length > 0}
			<section class={INSET_GROUP_CLASS}>
				{#each toolsPanel.categoryGroups as group (group.key)}
					{@render groupRow(group)}
				{/each}
			</section>
		{/if}

		{#if toolsPanel.mcpGroups.length > 0}
			<div class="flex flex-col gap-1.5">
				<h3 class="px-4 text-caption text-muted-foreground uppercase">
					{ATTACHMENT_MENU_TEXT.MCP_SERVERS}
				</h3>

				<section class={INSET_GROUP_CLASS}>
					{#each toolsPanel.mcpGroups as group (group.key)}
						{@render groupRow(group)}
					{/each}
				</section>
			</div>
		{/if}
	{/if}
{/snippet}

{#snippet groupRow(group: ToolGroup)}
	{@const checkState = toolsPanel.getGroupCheckState(group)}
	{@const favicon = toolsPanel.getFavicon(group)}
	{@const groupDisabled = toolsPanel.isGroupDisabled(group)}

	<div class="group/row flex min-h-12 items-center px-4 {groupDisabled ? 'opacity-50' : ''}">
		<button
			class="flex min-h-12 min-w-0 flex-1 items-center gap-3 self-stretch text-left text-body"
			onclick={() => push({ groupKey: group.key, id: 'group' })}
			type="button"
		>
			{#if favicon}
				<img
					alt=""
					class="{ICON_CLASS_DEFAULT} shrink-0 rounded-sm"
					onerror={(e) => {
						(e.currentTarget as HTMLImageElement).style.display = 'none';
					}}
					src={favicon}
				/>
			{:else}
				{@const SourceIcon = TOOL_SOURCE_ICONS[group.source] ?? Server}
				<SourceIcon class="{ICON_CLASS_DEFAULT} shrink-0" />
			{/if}

			<span
				class="flex min-w-0 flex-1 items-center gap-2 self-stretch border-t border-border/60 group-first/row:border-t-0"
			>
				<span class="min-w-0 flex-1 truncate">{group.label}</span>

				<span class="text-body-sm text-muted-foreground tabular-nums">
					{toolsPanel.getEnabledToolCount(group)}/{group.tools.length}
				</span>

				<ChevronRight class="size-4 shrink-0 text-muted-foreground" />
			</span>
		</button>

		<span
			class="flex items-center self-stretch border-t border-border/60 pl-3 group-first/row:border-t-0"
		>
			<Switch
				aria-label="{checkState.checked ? 'Disable' : 'Enable'} {group.label}"
				checked={checkState.checked}
				disabled={groupDisabled}
				onCheckedChange={() => toolsPanel.toggleGroupByKey(group.key)}
			/>
		</span>
	</div>
{/snippet}

{#snippet groupPage(group: ToolGroup)}
	{@const checkState = toolsPanel.getGroupCheckState(group)}
	{@const groupDisabled = toolsPanel.isGroupDisabled(group)}

	<section class="{INSET_GROUP_CLASS} {groupDisabled ? 'opacity-50' : ''}">
		<label class="{INSET_ROW_CLASS} cursor-pointer">
			<PencilRuler class="{ICON_CLASS_DEFAULT} shrink-0" />

			<span class={INSET_ROW_BODY_CLASS}>
				<span class="flex-1">{ATTACHMENT_MENU_TEXT.ALL_TOOLS}</span>

				<Switch
					checked={checkState.checked}
					disabled={groupDisabled}
					onCheckedChange={() => toolsPanel.toggleGroupByKey(group.key)}
				/>
			</span>
		</label>
	</section>

	<section class={INSET_GROUP_CLASS}>
		{#each group.tools as entry (entry.key)}
			{@const parentDisabled = toolsPanel.isToolParentDisabled(entry)}

			<label class="{INSET_ROW_CLASS} cursor-pointer {parentDisabled ? 'opacity-50' : ''}">
				<span class={INSET_ROW_BODY_CLASS}>
					<span class="min-w-0 flex-1 truncate font-mono text-body-sm">
						{entry.definition.function.name}
					</span>

					<Switch
						checked={toolsPanel.isToolEnabled(entry)}
						onCheckedChange={() => toolsPanel.toggleTool(entry)}
					/>
				</span>
			</label>
		{/each}
	</section>
{/snippet}
