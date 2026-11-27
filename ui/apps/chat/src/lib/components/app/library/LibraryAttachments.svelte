<script lang="ts">
	import LibraryAttachmentTile from './LibraryAttachmentTile.svelte';
	import * as Empty from '@ggml-org/llama-ui/ui/empty';
	import { Skeleton } from '@ggml-org/llama-ui/ui/skeleton';
	import { Paperclip, SearchX } from '@lucide/svelte';
	import { DialogChatAttachmentsPreview } from '#lib/components/app/index.ts';
	import {
		LIBRARY_ATTACHMENTS_COLUMN_MIN_WIDTH_PX,
		LIBRARY_ATTACHMENTS_MIN_COLUMNS,
		LIBRARY_ATTACHMENTS_SEARCH_DEBOUNCE_MS,
		LIBRARY_LOAD_MORE_MARGIN
	} from '#lib/constants/index.ts';
	import { RouterService } from '#lib/services/router.service.ts';
	import { chatStore, conversationsStore, libraryAttachmentsStore } from '#lib/stores/index.ts';
	import { debounce, type LibraryAttachment } from '#lib/utils/index.ts';
	import { goto } from '$app/navigation';
	import { onDestroy, untrack } from 'svelte';

	interface Props {
		query?: string;
	}

	let { query = '' }: Props = $props();

	/** Placeholder tiles while the first page is read, of unlike heights as files are. */
	const SKELETON_HEIGHT_CLASSES = ['h-40', 'h-56', 'h-32', 'h-48'];

	let gridWidth = $state(0);
	let sentinel: HTMLDivElement | undefined = $state();
	let previewOpen = $state(false);
	let previewIndex = $state(0);

	const items = $derived(libraryAttachmentsStore.items);
	const columnCount = $derived(
		Math.max(
			LIBRARY_ATTACHMENTS_MIN_COLUMNS,
			Math.floor(gridWidth / LIBRARY_ATTACHMENTS_COLUMN_MIN_WIDTH_PX)
		)
	);
	// Dealt out in turn, so the newest files stay across the top and a page that loads later
	// lands under the files already shown without moving them
	const columns = $derived(
		Array.from({ length: columnCount }, (_, column) =>
			items.filter((_, index) => index % columnCount === column)
		)
	);
	const conversationNames = $derived(
		new Map(
			conversationsStore.conversations.map((conversation) => [conversation.id, conversation.name])
		)
	);
	// the preview lists a message's newest file first, so it gets the files in reverse to
	// show them in the grid's order
	const previewAttachments = $derived(items.map((item) => item.attachment).reverse());

	const search = debounce(
		(text: string) => void libraryAttachmentsStore.search(text),
		LIBRARY_ATTACHMENTS_SEARCH_DEBOUNCE_MS
	);

	// showing the tab is the need for the files: the first page loads at once, a search once typing rests
	let isFirstLoad = true;

	$effect(() => {
		const text = query;

		untrack(() => {
			if (isFirstLoad) void libraryAttachmentsStore.search(text);
			else search(text);

			isFirstLoad = false;
		});
	});

	// the next page loads as the end of the grid comes near
	$effect(() => {
		if (!sentinel) return;

		const observer = new IntersectionObserver(
			(entries) => {
				if (entries.some((entry) => entry.isIntersecting)) void libraryAttachmentsStore.loadMore();
			},
			{ rootMargin: LIBRARY_LOAD_MORE_MARGIN }
		);

		observer.observe(sentinel);

		return () => observer.disconnect();
	});

	onDestroy(() => libraryAttachmentsStore.clear());

	function open(item: LibraryAttachment) {
		previewIndex = items.indexOf(item);
		previewOpen = true;
	}

	/** Opens the file's conversation at the message that holds it. */
	async function goToConversation(item: LibraryAttachment) {
		chatStore.scrollTarget = { convId: item.convId, messageId: item.messageId };

		await goto(RouterService.chat(item.convId));
	}
</script>

<div bind:clientWidth={gridWidth}>
	{#if items.length === 0 && libraryAttachmentsStore.isLoading}
		<div class="flex gap-4">
			{#each { length: columnCount } as _, column (column)}
				<div class="flex min-w-0 flex-1 flex-col gap-4">
					{#each SKELETON_HEIGHT_CLASSES as _, row (row)}
						<Skeleton
							class="{SKELETON_HEIGHT_CLASSES[
								(row + column) % SKELETON_HEIGHT_CLASSES.length
							]} rounded-xl"
						/>
					{/each}
				</div>
			{/each}
		</div>
	{:else if items.length === 0}
		<Empty.Root class="border py-16">
			<Empty.Header>
				<Empty.Media variant="icon">
					{#if query.trim()}
						<SearchX />
					{:else}
						<Paperclip />
					{/if}
				</Empty.Media>

				<Empty.Title>{query.trim() ? 'No attachments match' : 'No attachments yet'}</Empty.Title>

				<Empty.Description>
					{query.trim()
						? 'Try another search.'
						: 'The files you send in your chats show here: images, audio, video, PDFs and text.'}
				</Empty.Description>
			</Empty.Header>
		</Empty.Root>
	{:else}
		<div class="flex items-start gap-4">
			{#each columns as column, index (index)}
				<ul class="flex min-w-0 flex-1 flex-col gap-4">
					{#each column as item (item.id)}
						<li>
							<LibraryAttachmentTile
								conversationName={conversationNames.get(item.convId)}
								{item}
								onGoToConversation={(target) => void goToConversation(target)}
								onOpen={open}
							/>
						</li>
					{/each}
				</ul>
			{/each}
		</div>
	{/if}

	{#if libraryAttachmentsStore.hasMore}
		<div bind:this={sentinel} aria-hidden="true" class="h-px"></div>
	{/if}
</div>

<DialogChatAttachmentsPreview
	bind:open={previewOpen}
	attachments={previewAttachments}
	previewFocusIndex={previewIndex}
/>
