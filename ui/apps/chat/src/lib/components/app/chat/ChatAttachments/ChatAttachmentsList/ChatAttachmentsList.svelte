<script lang="ts">
	import {
		ChatAttachmentsListItem,
		DialogChatAttachmentsPreview,
		ScrollCarousel
	} from '$lib/components/app';
	import { ScrollCarouselVariant } from '$lib/enums';
	import { extensions, findAttachmentRenderer } from '$lib/extensions';
	import { getAttachmentDisplayItems } from '$lib/utils';

	interface Props {
		class?: string;
		style?: string;
		// For ChatMessage - stored attachments
		attachments?: DatabaseMessageExtra[];
		readonly?: boolean;
		// For ChatForm - pending uploads
		onFileRemove?: (fileId: string) => void;
		uploadedFiles?: ChatUploadedFile[];
		// Image size customization
		imageClass?: string;
		imageHeight?: string;
		imageWidth?: string;
		// Limit display to single row with "+ X more" button
		limitToSingleRow?: boolean;
		// For vision modality check
		activeModelId?: string;
	}

	let {
		activeModelId,
		attachments = [],
		class: className = '',
		// Default to small size for form previews
		imageClass = '',
		imageHeight = 'h-24',
		imageWidth = 'w-auto',
		limitToSingleRow = false,
		onFileRemove,
		readonly = false,
		style = '',
		uploadedFiles = $bindable([])
	}: Props = $props();

	let carouselRef: ScrollCarousel | undefined = $state();
	let previewFocusIndex = $state(0);
	let viewAllDialogOpen = $state(false);

	let displayItems = $derived(getAttachmentDisplayItems({ attachments, uploadedFiles }));

	function openPreview(item: ChatAttachmentDisplayItem, event?: MouseEvent) {
		event?.stopPropagation();
		event?.preventDefault();

		// items an extension draws stay out of the built-in preview, so they do not count
		const renderers = extensions.contributions('attachmentRenderers');
		const previewItems = displayItems.filter((i) => !findAttachmentRenderer(renderers, i));
		const index = previewItems.findIndex((i) => i.id === item.id);

		previewFocusIndex = index >= 0 ? index : 0;
		viewAllDialogOpen = true;
	}

	$effect(() => {
		if (carouselRef && displayItems.length) {
			carouselRef.resetScroll();
		}
	});
</script>

{#snippet attachmentitem(item: ChatAttachmentDisplayItem)}
	<ChatAttachmentsListItem
		{imageClass}
		{imageHeight}
		{imageWidth}
		{item}
		{limitToSingleRow}
		{onFileRemove}
		onPreview={(i: ChatAttachmentDisplayItem, event?: MouseEvent) => openPreview(i, event)}
		{readonly}
	/>
{/snippet}

{#if displayItems.length > 0}
	<div class={className} {style}>
		{#if limitToSingleRow}
			<ScrollCarousel bind:this={carouselRef} variant={ScrollCarouselVariant.CENTER}>
				{#each displayItems as item (item.id)}
					{@render attachmentitem(item)}
				{/each}
			</ScrollCarousel>
		{:else}
			<div class="flex flex-wrap items-start justify-end gap-3">
				{#each displayItems as item (item.id)}
					{@render attachmentitem(item)}
				{/each}
			</div>
		{/if}
	</div>
{/if}

<DialogChatAttachmentsPreview
	bind:open={viewAllDialogOpen}
	{activeModelId}
	{attachments}
	{previewFocusIndex}
	{uploadedFiles}
/>
