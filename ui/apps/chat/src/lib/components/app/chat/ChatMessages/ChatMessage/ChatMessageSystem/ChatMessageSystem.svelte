<script lang="ts">
	import { Button } from '@ggml-org/llama-ui/ui/button';
	import { Card } from '@ggml-org/llama-ui/ui/card';
	import { Check, X } from '@lucide/svelte';
	import {
		ChatMessageActionIcons,
		ChatMessagePromptContent,
		DialogPrompt,
		DialogPromptUpdate,
		MarkdownContent
	} from '#lib/components/app/index.ts';
	import { INPUT_CLASSES, PROMPT_ICON, SYSTEM_MESSAGE_PLACEHOLDER } from '#lib/constants/index.ts';
	import { getChatMessageEditContext } from '#lib/contexts/index.ts';
	import { AttachmentType, KeyboardKey, PromptDrift } from '#lib/enums/index.ts';
	import { extensions } from '#lib/extensions/index.ts';
	import { DatabaseService } from '#lib/services/database.service.ts';
	import { conversationsStore, promptsStore, settingsStore } from '#lib/stores/index.ts';
	import type { PromptDraft } from '#lib/stores/prompts.svelte.ts';
	import type {
		DatabaseMessageExtra,
		DatabaseMessageExtraPrompt,
		PromptLink
	} from '#lib/types/index.ts';
	import {
		autoResizeTextarea,
		getPromptDrift,
		isIMEComposing,
		promptLinkExtra
	} from '#lib/utils/index.ts';

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

	// The prompt this message is made from. An extension's prompt is drawn by its source;
	// any other is a library prompt, there or since deleted
	let extras = $derived<DatabaseMessageExtra[]>(message.extra ?? []);
	let promptLink = $derived(
		extras.find(
			(extra): extra is DatabaseMessageExtraPrompt => extra.type === AttachmentType.PROMPT
		)
	);
	let promptSource = $derived(
		promptLink
			? extensions.contributions('promptSources').find((source) => source.owns(promptLink.promptId))
			: undefined
	);
	let linkedPrompt = $derived(
		promptLink && !promptSource ? promptsStore.get(promptLink.promptId) : undefined
	);
	let drift = $derived(
		promptLink && !promptSource ? getPromptDrift(message, linkedPrompt) : PromptDrift.NONE
	);

	let showUpdateDialog = $state(false);
	let showAddDialog = $state(false);

	// a system message written in the chat, not yet a prompt, can be saved as one
	let canAddToLibrary = $derived(
		!promptLink && !!message.content.trim() && message.content !== SYSTEM_MESSAGE_PLACEHOLDER
	);

	/** Sets the message text and the prompt it is made from, keeping its other extras. */
	async function linkMessageToPrompt(content: string, link: PromptLink) {
		const extra = $state.snapshot([
			...extras.filter((item) => item.type !== AttachmentType.PROMPT),
			promptLinkExtra(link)
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
			name: promptsStore.get(linkedPrompt.id)?.name ?? name,
			promptId: linkedPrompt.id
		});

		showUpdateDialog = false;
	}

	async function handleSyncFromLibrary() {
		if (!linkedPrompt) return;

		await linkMessageToPrompt(linkedPrompt.content, {
			name: linkedPrompt.name,
			promptId: linkedPrompt.id
		});

		showUpdateDialog = false;
	}

	async function handleSaveAsNew() {
		if (!promptLink) return;

		const created = await promptsStore.add({ content: message.content, name: promptLink.name });

		if (created) {
			await linkMessageToPrompt(message.content, { name: created.name, promptId: created.id });
		}
	}

	async function handleAddToLibrary(draft: PromptDraft) {
		const created = await promptsStore.add({ ...draft, content: message.content });

		if (created) {
			await linkMessageToPrompt(created.content, { name: created.name, promptId: created.id });
		}
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
		<div class="w-full max-w-4/5">
			<textarea
				bind:this={textareaElement}
				class="min-h-15 w-full resize-none rounded-2xl px-3 py-2 text-body md:text-body-sm {INPUT_CLASSES}"
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
		{#if promptLink && promptSource?.card}
			<promptSource.card
				class="w-full max-w-4/5"
				content={message.content}
				name={promptLink.name}
				promptId={promptLink.promptId}
			/>
		{:else if promptLink}
			<ChatMessagePromptContent
				class="w-full max-w-4/5"
				content={message.content}
				name={linkedPrompt?.name ?? promptLink.name}
			>
				{#snippet status()}
					{#if drift === PromptDrift.LIBRARY || drift === PromptDrift.MESSAGE}
						<button
							class="shrink-0 text-caption font-medium text-amber-600 hover:text-amber-700 hover:underline dark:text-amber-400 dark:hover:text-amber-300"
							onclick={() => (showUpdateDialog = true)}
							title="This system message differs from its prompt. Click to update the prompt or sync from it."
							type="button"
						>
							Modified
						</button>
					{:else if drift === PromptDrift.MISSING}
						<button
							class="shrink-0 text-caption font-medium text-muted-foreground hover:text-foreground hover:underline"
							onclick={handleSaveAsNew}
							title="The prompt is not in the library. Save this system message as a new prompt."
							type="button"
						>
							Save as new
						</button>
					{/if}
				{/snippet}
			</ChatMessagePromptContent>
		{:else}
			{#if message.content.trim()}
				<div class="relative max-w-4/5">
					<button
						class="group/expand block w-full text-left {!isExpanded && showExpandButton
							? 'cursor-pointer'
							: 'cursor-auto'}"
						onclick={showExpandButton && !isExpanded ? toggleExpand : undefined}
						type="button"
					>
						<Card
							class="overflow-y-auto rounded-2xl !border-2 !border-dashed !border-border/50 bg-muted px-3.75 py-1.5 data-[multiline]:py-2.5"
							data-multiline={isMultiline ? '' : undefined}
							style="border: 2px dashed hsl(var(--line-default)); max-height: var(--max-message-height); overflow-wrap: anywhere; word-break: break-word;"
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
											class="rounded-full px-4 py-1.5 text-caption shadow-(--elevation-surface)"
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
										class="rounded-full px-4 py-1.5 text-caption"
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

			{#if canAddToLibrary}
				<button
					class="flex items-center gap-1.5 text-caption font-medium text-muted-foreground hover:text-foreground hover:underline"
					onclick={() => (showAddDialog = true)}
					title="Save this system message as a prompt, to use it in other chats."
					type="button"
				>
					<PROMPT_ICON class="size-icon-sm" />

					Add to library
				</button>
			{/if}
		{/if}

		{#if message.timestamp}
			<div class="max-w-4/5">
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
