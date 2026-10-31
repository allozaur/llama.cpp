<script lang="ts">
	import {
		ChevronDown,
		ChevronRight,
		File,
		Image,
		MessageSquare,
		Mic,
		PencilRuler,
		Plus,
		Video
	} from '@lucide/svelte';
	import { McpLogo } from '$lib/components/app';
	import SearchInput from '$lib/components/app/forms/SearchInput.svelte';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import * as Collapsible from '$lib/components/ui/collapsible';
	import * as Drawer from '$lib/components/ui/drawer';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import {
		ATTACHMENT_FILE_ITEMS,
		ATTACHMENT_MENU_TEXT,
		ATTACHMENT_MODALITY_TEXT,
		ICON_CLASS_DEFAULT,
		PROJECT_ICON
	} from '$lib/constants';
	import { getChatFormActionsContext } from '$lib/contexts';
	import { AttachmentAction, AttachmentItemEnabledWhen } from '$lib/enums/attachment.enums';
	import { useAttachmentMenu } from '$lib/hooks/use-attachment-menu.svelte';
	import { useSystemMessagePrompts } from '$lib/hooks/use-system-message-prompts.svelte';
	import { useToolsPanel } from '$lib/hooks/use-tools-panel.svelte';
	import { conversationsStore, projectsStore, uiStore } from '$lib/stores';
	import type { MCPPromptInfo, ToolGroup } from '$lib/types';
	import type { Snippet } from 'svelte';

	interface Props {
		class?: string;
		trigger: Snippet<[{ disabled: boolean; onclick?: () => void }]>;
	}

	let { class: className = '', trigger }: Props = $props();

	const chatFormActions = getChatFormActionsContext();

	let drawerOpen = $state(false);
	let promptsExpanded = $state(false);
	let toolsExpanded = $state(false);

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

	const FILE_MODALITY_ICONS: Record<string, { icon: typeof Image; label: string }> = {
		[AttachmentItemEnabledWhen.HAS_AUDIO_MODALITY]: {
			icon: Mic,
			label: ATTACHMENT_MODALITY_TEXT[AttachmentItemEnabledWhen.HAS_AUDIO_MODALITY]
		},
		[AttachmentItemEnabledWhen.HAS_VIDEO_MODALITY]: {
			icon: Video,
			label: ATTACHMENT_MODALITY_TEXT[AttachmentItemEnabledWhen.HAS_VIDEO_MODALITY]
		},
		[AttachmentItemEnabledWhen.HAS_VISION_MODALITY]: {
			icon: Image,
			label: ATTACHMENT_MODALITY_TEXT[AttachmentItemEnabledWhen.HAS_VISION_MODALITY]
		}
	};

	const supportedModalities = $derived.by(() =>
		ATTACHMENT_FILE_ITEMS.filter((item) => attachmentMenu.isItemEnabled(item.enabledWhen))
			.map((item) => FILE_MODALITY_ICONS[item.enabledWhen ?? ''])
			.filter((modality) => modality !== undefined)
	);

	const toolsPanel = useToolsPanel();

	const systemPrompts = useSystemMessagePrompts({
		onMcpPromptArguments: (prompt: MCPPromptInfo) => {
			drawerOpen = false;
			chatFormActions.onMcpPromptClick?.(prompt);
		},
		onPromptSelect: (content, promptId, title) => {
			drawerOpen = false;
			chatFormActions.onSystemPromptWithContent?.(content, promptId, title);
		}
	});

	$effect(() => {
		if (promptsExpanded) void systemPrompts.loadMcpPrompts();
	});

	const itemClass =
		'flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent active:bg-accent disabled:cursor-not-allowed disabled:opacity-50';

	const itemRowClass =
		'flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent';
</script>

<div class="flex items-center gap-1 {className}">
	<Drawer.Root bind:open={drawerOpen}>
		{@render trigger({ disabled: chatFormActions.disabled, onclick: () => (drawerOpen = true) })}

		<Drawer.Content class="gap-0 overflow-y-auto">
			<Drawer.Header>
				<Drawer.Title>{ATTACHMENT_MENU_TEXT.ADD_TO_CHAT}</Drawer.Title>

				<Drawer.Description class="sr-only">
					{ATTACHMENT_MENU_TEXT.DESCRIPTION}
				</Drawer.Description>
			</Drawer.Header>

			<div class="flex flex-col gap-1 px-1.5 pb-2">
				<button
					class={itemClass}
					onclick={() => attachmentMenu.callbacks[AttachmentAction.FILE_UPLOAD]()}
					type="button"
				>
					<File class="{ICON_CLASS_DEFAULT} shrink-0" />

					<span class="flex min-w-0 items-center gap-2">
						<span>{ATTACHMENT_MENU_TEXT.ADD_FILES}</span>

						{#if supportedModalities.length > 0}
							<span class="flex items-center gap-0.75 text-muted-foreground">
								{#each supportedModalities as modality (modality.label)}
									<Tooltip.Root>
										<Tooltip.Trigger>
											<modality.icon class="size-2.75" />
										</Tooltip.Trigger>

										<Tooltip.Content>
											<p>{modality.label}</p>
										</Tooltip.Content>
									</Tooltip.Root>
								{/each}
							</span>
						{/if}
					</span>
				</button>

				<button
					class={itemClass}
					onclick={() => {
						drawerOpen = false;
						uiStore.openProjectPicker({
							currentProjectId:
								conversationsStore.activeConversation?.projectId ??
								conversationsStore.preferences.pendingProjectId,
							onSelect: (projectId) =>
								void conversationsStore.assignActiveConversationProject(
									projectsStore.get(projectId) ?? null
								)
						});
					}}
					type="button"
				>
					<PROJECT_ICON class="{ICON_CLASS_DEFAULT} shrink-0" />

					<span>{ATTACHMENT_MENU_TEXT.ADD_TO_PROJECT}</span>
				</button>

				<Collapsible.Root onOpenChange={(open) => (promptsExpanded = open)} open={promptsExpanded}>
					<Collapsible.Trigger class={itemClass}>
						{#if promptsExpanded}
							<ChevronDown class="{ICON_CLASS_DEFAULT} shrink-0" />
						{:else}
							<ChevronRight class="{ICON_CLASS_DEFAULT} shrink-0" />
						{/if}

						<MessageSquare class="{ICON_CLASS_DEFAULT} shrink-0" />

						<span class="flex-1">{ATTACHMENT_MENU_TEXT.SYSTEM_MESSAGE}</span>
					</Collapsible.Trigger>

					<Collapsible.Content>
						<div class="flex flex-col gap-0.5 pl-4">
							{#if systemPrompts.hasPrompts}
								<div class="mb-1">
									<SearchInput
										bind:value={systemPrompts.searchQuery}
										placeholder="Search by name, content, or server..."
										size="sm"
									/>
								</div>
							{/if}

							<button
								class={itemClass}
								onclick={() => attachmentMenu.callbacks[AttachmentAction.SYSTEM_PROMPT_CLICK]()}
								type="button"
							>
								<Plus class="{ICON_CLASS_DEFAULT} shrink-0" />

								<span>Write new</span>
							</button>

							{#each systemPrompts.libraryPrompts as prompt (prompt.id)}
								<button
									class="{itemClass} flex-col items-start gap-0.5 py-2"
									onclick={() => systemPrompts.selectLibraryPrompt(prompt.id)}
									type="button"
								>
									<span class="line-clamp-1 text-sm font-medium">{prompt.name}</span>

									{#if prompt.description}
										<span class="line-clamp-1 w-full text-xs text-muted-foreground">
											{prompt.description}
										</span>
									{/if}

									<span class="line-clamp-3 w-full text-xs text-muted-foreground">
										{prompt.content}
									</span>
								</button>
							{/each}

							{#each systemPrompts.mcpEntries as entry (entry.prompt.serverName + entry.prompt.name)}
								<button
									class="{itemClass} flex-col items-start gap-0.5 py-2"
									onclick={() => systemPrompts.selectMcpPrompt(entry)}
									type="button"
								>
									<span class="flex w-full items-center gap-1.5">
										{#if entry.faviconUrl}
											<img
												alt=""
												class="{ICON_CLASS_DEFAULT} shrink-0 rounded-sm"
												onerror={(e) => {
													(e.currentTarget as HTMLImageElement).style.display = 'none';
												}}
												src={entry.faviconUrl}
											/>
										{:else}
											<McpLogo class="{ICON_CLASS_DEFAULT} shrink-0" />
										{/if}

										<span class="truncate text-xs text-muted-foreground">{entry.serverLabel}</span>

										{#if entry.prompt.arguments?.length}
											<span class="ml-auto shrink-0 text-xs text-muted-foreground">
												{entry.prompt.arguments.length} arg{entry.prompt.arguments.length > 1
													? 's'
													: ''}
											</span>
										{/if}
									</span>

									<span class="line-clamp-1 text-sm font-medium">
										{entry.prompt.title || entry.prompt.name}
									</span>

									{#if entry.prompt.description}
										<span class="line-clamp-2 w-full text-xs text-muted-foreground">
											{entry.prompt.description}
										</span>
									{/if}
								</button>
							{/each}

							{#if systemPrompts.hasNoMatches}
								<div class="px-3 py-2 text-xs text-muted-foreground">No matches</div>
							{/if}
						</div>
					</Collapsible.Content>
				</Collapsible.Root>

				{#if toolsPanel.totalToolCount > 0}
					<Collapsible.Root onOpenChange={(open) => (toolsExpanded = open)} open={toolsExpanded}>
						<Collapsible.Trigger class={itemClass}>
							{#if toolsExpanded}
								<ChevronDown class="{ICON_CLASS_DEFAULT} shrink-0" />
							{:else}
								<ChevronRight class="{ICON_CLASS_DEFAULT} shrink-0" />
							{/if}

							<PencilRuler class="inline {ICON_CLASS_DEFAULT} shrink-0" />

							<span class="flex-1">{ATTACHMENT_MENU_TEXT.TOOLS}</span>
						</Collapsible.Trigger>

						<Collapsible.Content>
							<div class="flex flex-col gap-0.5 pl-4">
								{#each toolsPanel.categoryGroups as group (group.key)}
									{@render groupRow(group)}
								{/each}

								{#each toolsPanel.mcpGroups as group (group.key)}
									{@render groupRow(group)}
								{/each}
							</div>
						</Collapsible.Content>
					</Collapsible.Root>
				{/if}
			</div>
		</Drawer.Content>
	</Drawer.Root>
</div>

{#snippet groupRow(group: ToolGroup)}
	{@const checkState = toolsPanel.getGroupCheckState(group)}
	{@const enabledCount = toolsPanel.getEnabledToolCount(group)}
	{@const favicon = toolsPanel.getFavicon(group)}
	{@const groupDisabled = toolsPanel.isGroupDisabled(group)}

	<button
		class="{itemRowClass} {groupDisabled ? 'pointer-events-none opacity-50' : ''}"
		onclick={() => toolsPanel.toggleGroupByKey(group.key)}
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
		{/if}

		<span class="min-w-0 flex-1 truncate text-sm font-medium">{group.label}</span>

		<span class="shrink-0 text-xs text-muted-foreground">
			{enabledCount}/{group.tools.length}
		</span>

		<Checkbox
			checked={checkState.checked}
			class="{ICON_CLASS_DEFAULT} shrink-0"
			indeterminate={checkState.indeterminate}
			onCheckedChange={() => toolsPanel.toggleGroupByKey(group.key)}
			onclick={(e) => e.stopPropagation()}
		/>
	</button>
{/snippet}
