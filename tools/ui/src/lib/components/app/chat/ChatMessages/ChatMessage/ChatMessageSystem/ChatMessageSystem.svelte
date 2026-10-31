<script lang="ts">
	import { Check, ScanText, X } from '@lucide/svelte';
	import {
		ChatMessageActionIcons,
		DialogPrompt,
		DialogPromptUpdate,
		MarkdownContent
	} from '$lib/components/app';
	import { Button } from '$lib/components/ui/button';
	import { Card } from '$lib/components/ui/card';
	import { INPUT_CLASSES, SYSTEM_MESSAGE_PLACEHOLDER } from '$lib/constants';
	import { getChatMessageEditContext } from '$lib/contexts';
	import { AttachmentType, KeyboardKey, PromptDrift } from '$lib/enums';
	import { DatabaseService } from '$lib/services/database.service';
	import { conversationsStore, promptsStore, settingsStore } from '$lib/stores';
	import type { PromptDraft } from '$lib/stores/prompts.svelte';
	import type { DatabaseMessageExtra, DatabaseMessageExtraPrompt } from '$lib/types';
	import { autoResizeTextarea, getPromptDrift, isIMEComposing, isMcpPromptId } from '$lib/utils';

	interface Props {
		class?: string;
		message: DatabaseMessage;
		textareaElement?: HTMLTextAreaElement;
	}

	let { class: className = '', message, textareaElement = $bindable() }: Props = $props();

	const editCtx = getChatMessageEditContext();

	function handleEditKeydown(event: KeyboardEvent) {
		if (event.key === KeyboardKey.ENTER && !event.shiftKey && !isIMEComposing(event)) {
			event.preventDefault();

			editCtx.save();
		} else if (event.key === KeyboardKey.ESCAPE) {
			event.preventDefault();

			editCtx.cancel();
		}
	}

	let isMultiline = $state(false);
	let messageElement: HTMLElement | undefined = $state();
	let isExpanded = $state(false);
	let contentHeight = $state(0);

	const MAX_HEIGHT = 200; // pixels
	const currentConfig = settingsStore.config;

	let showExpandButton = $derived(contentHeight > MAX_HEIGHT);

	// The prompt this message was made from. MCP prompts are linked by name only,
	// so they never resolve against the library.
	let messageExtras = $derived<DatabaseMessageExtra[]>(message.extra ?? []);
	let promptLink = $derived(
		messageExtras.find(
			(extra): extra is DatabaseMessageExtraPrompt => extra.type === AttachmentType.PROMPT
		)
	);
	let libraryPromptId = $derived(
		promptLink && !isMcpPromptId(promptLink.promptId) ? promptLink.promptId : undefined
	);
	let linkedPrompt = $derived(libraryPromptId ? promptsStore.get(libraryPromptId) : undefined);
	let drift = $derived(libraryPromptId ? getPromptDrift(message, linkedPrompt) : PromptDrift.NONE);
	let showUpdateDialog = $state(false);
	let showAddDialog = $state(false);

	// a system message written in the chat, not yet a prompt, can be saved as one
	let canAddToLibrary = $derived(
		!promptLink && !!message.content.trim() && message.content !== SYSTEM_MESSAGE_PLACEHOLDER
	);

	/** Sets the message text and links it to a prompt, keeping its other extras. */
	async function linkMessageToPrompt(content: string, link: { promptId: string; title: string }) {
		const extra = $state.snapshot([
			...messageExtras.filter((extra) => extra.type !== AttachmentType.PROMPT),
			{ type: AttachmentType.PROMPT, ...link }
		]) as DatabaseMessageExtra[];

		await DatabaseService.updateMessage(message.id, { content, extra });

		const index = conversationsStore.findMessageIndex(message.id);

		if (index !== -1) conversationsStore.updateMessageAtIndex(index, { content, extra });
	}

	async function handleUpdateLibrary(name: string) {
		if (!linkedPrompt) return;

		const content = message.content.trim();

		await promptsStore.update(linkedPrompt.id, { content, name });
		await linkMessageToPrompt(content, {
			promptId: linkedPrompt.id,
			title: promptsStore.get(linkedPrompt.id)?.name ?? name
		});

		showUpdateDialog = false;
	}

	async function handleSyncFromLibrary() {
		if (!linkedPrompt) return;

		await linkMessageToPrompt(linkedPrompt.content, {
			promptId: linkedPrompt.id,
			title: linkedPrompt.name
		});

		showUpdateDialog = false;
	}

	async function handleSaveAsNew() {
		if (!promptLink) return;

		const created = await promptsStore.add({
			content: message.content,
			name: promptLink.title
		});

		if (!created) return;

		await linkMessageToPrompt(message.content, { promptId: created.id, title: created.name });
	}

	async function handleAddToLibrary(draft: PromptDraft) {
		const created = await promptsStore.add({ ...draft, content: message.content });

		if (!created) return;

		await linkMessageToPrompt(created.content, { promptId: created.id, title: created.name });
	}

	$effect(() => {
		if (!messageElement || !message.content.trim()) return;

		if (message.content.includes('\n')) {
			isMultiline = true;
		}

		const resizeObserver = new ResizeObserver((entries) => {
			for (const entry of entries) {
				const element = entry.target as HTMLElement;
				const estimatedSingleLineHeight = 24;

				isMultiline = element.offsetHeight > estimatedSingleLineHeight * 1.5;
				contentHeight = element.scrollHeight;
			}
		});

		resizeObserver.observe(messageElement);

		return () => {
			resizeObserver.disconnect();
		};
	});
	$effect(() => {
		if (editCtx.isEditing && textareaElement) {
			autoResizeTextarea(textareaElement);
		}
	});

	function toggleExpand() {
		isExpanded = !isExpanded;
	}
</script>

<div
	aria-label="System message with actions"
	class="group flex flex-col items-end gap-3 md:gap-2 {className}"
	role="group"
>
	{#if editCtx.isEditing}
		<div class="w-full max-w-[80%]">
			<textarea
				bind:this={textareaElement}
				class="min-h-[60px] w-full resize-none rounded-2xl px-3 py-2 text-base md:text-sm {INPUT_CLASSES}"
				oninput={(e) => {
					autoResizeTextarea(e.currentTarget);
					editCtx.setContent(e.currentTarget.value);
				}}
				onkeydown={handleEditKeydown}
				placeholder="Edit system message..."
				style="max-height: var(--max-message-height);"
				value={editCtx.editedContent}
			></textarea>

			<div class="mt-2 flex justify-end gap-2">
				<Button class="h-8 px-3" onclick={editCtx.cancel} size="sm" variant="outline">
					<X class="mr-1 size-icon-md" />

					Cancel
				</Button>

				<Button
					class="h-8 px-3"
					disabled={!editCtx.editedContent.trim()}
					onclick={editCtx.save}
					size="sm"
				>
					<Check class="mr-1 size-icon-md" />

					Save
				</Button>
			</div>
		</div>
	{:else}
		{#if message.content.trim()}
			<div class="relative max-w-[80%]">
				<button
					class="group/expand block w-full text-left {!isExpanded && showExpandButton
						? 'cursor-pointer'
						: 'cursor-auto'}"
					onclick={showExpandButton && !isExpanded ? toggleExpand : undefined}
					type="button"
				>
					<Card
						class="overflow-y-auto rounded-[1.125rem] !border-2 !border-dashed !border-border/50 bg-muted px-3.75 py-1.5 data-[multiline]:py-2.5"
						data-multiline={isMultiline ? '' : undefined}
						style="border: 2px dashed hsl(var(--border)); max-height: var(--max-message-height); overflow-wrap: anywhere; word-break: break-word;"
					>
						<div
							class="relative transition-all duration-300 {isExpanded
								? 'cursor-text select-text'
								: 'select-none'}"
							style={!isExpanded && showExpandButton
								? `max-height: ${MAX_HEIGHT}px;`
								: 'max-height: none;'}
						>
							{#if currentConfig.renderUserContentAsMarkdown}
								<div bind:this={messageElement} class={isExpanded ? 'cursor-text' : ''}>
									<MarkdownContent class="markdown-system-content" content={message.content} />
								</div>
							{:else}
								<span
									bind:this={messageElement}
									class="text-md whitespace-pre-wrap {isExpanded ? 'cursor-text' : ''}"
								>
									{message.content}
								</span>
							{/if}

							{#if !isExpanded && showExpandButton}
								<div
									class="pointer-events-none absolute right-0 bottom-0 left-0 h-48 bg-gradient-to-t from-muted to-transparent"
								></div>

								<div
									class="pointer-events-none absolute right-0 bottom-4 left-0 flex justify-center opacity-0 transition-opacity group-hover/expand:opacity-100"
								>
									<Button
										class="rounded-full px-4 py-1.5 text-xs shadow-md"
										size="sm"
										variant="outline"
									>
										Show full system message
									</Button>
								</div>
							{/if}
						</div>

						{#if isExpanded && showExpandButton}
							<div class="mb-2 flex justify-center">
								<Button
									class="rounded-full px-4 py-1.5 text-xs"
									onclick={(e) => {
										e.stopPropagation();
										toggleExpand();
									}}
									size="sm"
									variant="outline"
								>
									Collapse System Message
								</Button>
							</div>
						{/if}
					</Card>
				</button>
			</div>
		{/if}

		{#if promptLink}
			<div class="flex items-center gap-2">
				<ScanText class="h-3.5 w-3.5 text-muted-foreground" />

				<span class="text-xs font-medium text-muted-foreground">{promptLink.title}</span>

				{#if drift === PromptDrift.LIBRARY || drift === PromptDrift.MESSAGE}
					<button
						class="text-xs font-medium text-amber-600 hover:text-amber-700 hover:underline dark:text-amber-400 dark:hover:text-amber-300"
						onclick={() => (showUpdateDialog = true)}
						title="This system message differs from its prompt. Click to update the prompt or sync from it."
						type="button"
					>
						Modified
					</button>
				{:else if drift === PromptDrift.MISSING}
					<button
						class="text-xs font-medium text-muted-foreground hover:text-foreground hover:underline"
						onclick={handleSaveAsNew}
						title="The prompt no longer exists. Save this system message as a new prompt."
						type="button"
					>
						Save as new
					</button>
				{/if}
			</div>
		{:else if canAddToLibrary}
			<button
				class="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:underline"
				onclick={() => (showAddDialog = true)}
				title="Save this system message as a prompt, to start other chats from it."
				type="button"
			>
				<ScanText class="h-3.5 w-3.5" />

				Add to library
			</button>
		{/if}

		{#if message.timestamp}
			<div class="max-w-[80%]">
				<ChatMessageActionIcons actionsPosition="right" justify="end" />
			</div>
		{/if}
	{/if}

	<DialogPrompt
		bind:open={showAddDialog}
		contentEditable={false}
		initialContent={message.content}
		onSave={handleAddToLibrary}
	/>

	{#if linkedPrompt}
		<DialogPromptUpdate
			bind:open={showUpdateDialog}
			content={message.content}
			{drift}
			onCancel={() => (showUpdateDialog = false)}
			onConfirm={handleUpdateLibrary}
			onSync={handleSyncFromLibrary}
			prompt={linkedPrompt}
		/>
	{/if}
</div>
