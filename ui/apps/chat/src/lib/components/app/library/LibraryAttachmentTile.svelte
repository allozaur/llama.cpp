<script lang="ts">
	import { ClipboardCopy, Download, MessageSquareShare, MoreHorizontal } from '@lucide/svelte';
	import { ContextMenuActions, DropdownMenuActions } from '#lib/components/app/index.ts';
	import {
		DEFAULT_FILE_ICON,
		LIBRARY_ATTACHMENT_ICONS,
		LIBRARY_TEXT_PREVIEW_CHARS
	} from '#lib/constants/index.ts';
	import type { MenuAction } from '#lib/types/index.ts';
	import {
		attachmentImage,
		attachmentText,
		copyToClipboard,
		downloadAttachment,
		type LibraryAttachment
	} from '#lib/utils/index.ts';

	interface Props {
		item: LibraryAttachment;
		/** The name of the conversation the file was sent in, when it is known. */
		conversationName?: string;
		/** Open that conversation at the message that holds the file. */
		onGoToConversation: (item: LibraryAttachment) => void;
		/** Open the file in the preview. */
		onOpen: (item: LibraryAttachment) => void;
	}

	let { conversationName, item, onGoToConversation, onOpen }: Props = $props();

	let contextMenuOpen = $state(false);

	const image = $derived(attachmentImage(item.attachment));
	const text = $derived(attachmentText(item.attachment));
	const Icon = $derived(LIBRARY_ATTACHMENT_ICONS[item.attachment.type] ?? DEFAULT_FILE_ICON);

	// the "more actions" dropdown and the right-click menu offer the same actions
	const actions = $derived<MenuAction[]>([
		{
			icon: MessageSquareShare,
			label: 'Go to conversation',
			onclick: () => onGoToConversation(item)
		},
		{ icon: Download, label: 'Download', onclick: () => downloadAttachment(item.attachment) },
		...(text === undefined
			? []
			: [
					{
						icon: ClipboardCopy,
						label: 'Copy text',
						onclick: () => void copyToClipboard(text, 'Copied to clipboard')
					}
				])
	]);
</script>

<ContextMenuActions bind:open={contextMenuOpen} {actions}>
	<figure class="group relative flex flex-col gap-1.5">
		<button
			aria-label="Open {item.attachment.name}"
			class="block w-full cursor-pointer overflow-hidden rounded-xl border border-border/40 bg-muted/40 text-left transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none {contextMenuOpen
				? 'bg-muted'
				: ''}"
			onclick={() => onOpen(item)}
			type="button"
		>
			{#if image}
				<img alt="" class="block w-full" decoding="async" loading="lazy" src={image} />
			{:else if text}
				<!-- the file's own first lines: a text is known by how it starts -->
				<p
					class="max-h-48 overflow-hidden p-3 font-mono text-caption-sm break-words whitespace-pre-wrap text-muted-foreground"
				>
					{text.slice(0, LIBRARY_TEXT_PREVIEW_CHARS)}
				</p>
			{:else}
				<span class="flex aspect-4/3 items-center justify-center text-muted-foreground">
					<Icon class="size-8 opacity-60" />
				</span>
			{/if}
		</button>

		<div
			class="absolute top-2 right-2 rounded-md bg-background/80 opacity-0 backdrop-blur transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 max-md:opacity-100"
		>
			<DropdownMenuActions
				{actions}
				triggerIcon={MoreHorizontal}
				triggerTooltip="Attachment actions"
			/>
		</div>

		<figcaption class="flex min-w-0 flex-col px-0.5">
			<span class="truncate text-caption">{item.attachment.name}</span>

			{#if conversationName}
				<span class="truncate text-caption text-muted-foreground">{conversationName}</span>
			{/if}
		</figcaption>
	</figure>
</ContextMenuActions>
