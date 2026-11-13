<script lang="ts">
	import {
		ChatAttachmentsListItemThumbnailFile,
		ChatAttachmentsListItemThumbnailImage
	} from '$lib/components/app';
	import { AttachmentType } from '$lib/enums';
	import { extensions, findAttachmentRenderer } from '$lib/extensions';
	import type { ChatAttachmentDisplayItem } from '$lib/types';
	import { isPdfFile } from '$lib/utils';

	interface Props {
		class?: string;
		imageClass?: string;
		imageHeight?: string;
		imageWidth?: string;
		item: ChatAttachmentDisplayItem;
		limitToSingleRow?: boolean;
		onFileRemove?: (fileId: string) => void;
		onPreview?: (item: ChatAttachmentDisplayItem) => void;
		readonly?: boolean;
	}

	let {
		class: className = '',
		imageClass = '',
		imageHeight = 'h-24',
		imageWidth = 'w-auto',
		item,
		limitToSingleRow = false,
		onFileRemove,
		onPreview,
		readonly = false
	}: Props = $props();

	const scrollClasses = $derived(limitToSingleRow ? 'first:ml-4 last:mr-4' : '');
	// Carousel items must keep their width; wrapped attachments (message bubbles)
	// shrink so wide images fit the bubble instead of overflowing it
	const layoutClasses = $derived(limitToSingleRow ? 'flex-shrink-0' : 'min-w-0');

	// an extension can claim an item and draw it in place of the default chip
	const renderer = $derived(
		findAttachmentRenderer(extensions.contributions('attachmentRenderers'), item)
	);
</script>

{#if renderer}
	<renderer.component
		class="{className} {scrollClasses}"
		{item}
		onRemove={onFileRemove ? () => onFileRemove(item.id) : undefined}
		{readonly}
	/>
{:else if item.isImage && item.preview}
	<ChatAttachmentsListItemThumbnailImage
		class="{layoutClasses} cursor-pointer {className} {scrollClasses}"
		height={imageHeight}
		id={item.id}
		{imageClass}
		name={item.name}
		onRemove={onFileRemove}
		onclick={() => onPreview?.(item)}
		preview={item.preview}
		{readonly}
		width={imageWidth}
	/>
{:else if isPdfFile(item.attachment, item.uploadedFile) && item.preview}
	{@const pageCount =
		item.attachment?.type === AttachmentType.PDF ? (item.attachment.images?.length ?? 0) : 0}

	<ChatAttachmentsListItemThumbnailImage
		class="{layoutClasses} cursor-pointer {className} {scrollClasses}"
		height={imageHeight}
		id={item.id}
		{imageClass}
		label={pageCount > 0 ? `PDF, ${pageCount} ${pageCount === 1 ? 'page' : 'pages'}` : 'PDF'}
		name={item.name}
		onRemove={onFileRemove}
		onclick={() => onPreview?.(item)}
		preview={item.preview}
		{readonly}
		width={imageWidth}
	/>
{:else}
	<ChatAttachmentsListItemThumbnailFile
		attachment={item.attachment}
		class="flex-shrink-0 cursor-pointer {className} {scrollClasses}"
		id={item.id}
		name={item.name}
		onRemove={onFileRemove}
		onclick={() => onPreview?.(item)}
		{readonly}
		size={item.size}
		textContent={item.textContent}
		uploadedFile={item.uploadedFile}
	/>
{/if}
