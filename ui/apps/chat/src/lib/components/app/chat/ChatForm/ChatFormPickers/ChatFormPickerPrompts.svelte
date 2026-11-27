<script lang="ts">
	import ChatFormPickerPromptOrigin from './ChatFormPickerPromptOrigin.svelte';
	import { Badge } from '@ggml-org/llama-ui/ui/badge';
	import {
		ChatFormPickerList,
		ChatFormPickerListItem,
		ChatFormPickerListItemSkeleton,
		ChatFormPickerPopover
	} from '#lib/components/app/chat/index.ts';
	import { PROMPT_SEARCH_MIN_ITEMS } from '#lib/constants/index.ts';
	import type { ComposerPickerProps } from '#lib/extensions/index.ts';
	import { usePickerNavigation } from '#lib/hooks/use-picker-navigation.svelte.ts';
	import { type PromptItem, usePromptList } from '#lib/hooks/use-prompt-list.svelte.ts';
	import { untrack } from 'svelte';

	/**
	 * The prompt picker `/prompt` opens: the library's prompts and the ones extensions
	 * offer, such as an MCP server's, each with where it comes from. Picking one
	 * attaches it to the message being written.
	 */
	let { anchor, composer, isOpen, onClose, query }: ComposerPickerProps = $props();

	const prompts = usePromptList();

	const nav = usePickerNavigation({
		count: () => prompts.items.length,
		isOpen: () => isOpen,
		onClose: () => onClose(),
		onSelect: (index) => pick(prompts.items[index])
	});

	// opening the picker is the need for the listings
	$effect(() => {
		if (!isOpen) return;

		untrack(() => {
			nav.reset(0);
			void prompts.load();
		});
	});

	// what is typed after `/prompt` searches the list, like its own search field does
	$effect(() => {
		if (isOpen) prompts.searchQuery = query;
	});

	$effect(() => {
		if (nav.hoveredIndex >= prompts.items.length) nav.reset(0);
	});

	function pick({ entry, source }: PromptItem) {
		// closed first: a prompt with arguments opens its source's own form in the picker's place
		onClose();
		source.attach(entry, composer);
	}

	export function handleKeydown(event: KeyboardEvent): boolean {
		return nav.handleKeydown(event);
	}
</script>

<ChatFormPickerPopover
	bind:isOpen
	customAnchor={anchor}
	{onClose}
	onKeydown={handleKeydown}
	srLabel="Open prompt picker"
>
	<ChatFormPickerList
		bind:searchQuery={prompts.searchQuery}
		emptyMessage={prompts.total === 0
			? 'No prompts yet. Save one in the Library.'
			: 'No matching prompt'}
		isLoading={prompts.isLoading}
		itemKey={({ entry, source }) => `${source.id}:${entry.id}`}
		items={prompts.items}
		scrollTrigger={nav.scrollTrigger}
		searchPlaceholder="Search prompts..."
		selectedIndex={nav.hoveredIndex}
		showSearchInput={prompts.total >= PROMPT_SEARCH_MIN_ITEMS}
	>
		{#snippet item(prompt, index, isSelected)}
			<ChatFormPickerListItem
				dataIndex={index}
				{isSelected}
				onclick={() => pick(prompt)}
				onhover={() => nav.setHover(index)}
			>
				<div class="min-w-0 flex-1">
					<ChatFormPickerPromptOrigin class="mb-0.5" entry={prompt.entry} source={prompt.source} />

					<div class="flex items-center gap-2">
						<span class="truncate font-medium">{prompt.entry.title}</span>

						{#if prompt.entry.argumentCount > 0}
							<Badge variant="secondary">
								{prompt.entry.argumentCount} arg{prompt.entry.argumentCount > 1 ? 's' : ''}
							</Badge>
						{/if}
					</div>

					{#if prompt.entry.description}
						<p class="mt-0.5 truncate text-body-sm text-muted-foreground">
							{prompt.entry.description}
						</p>
					{/if}
				</div>
			</ChatFormPickerListItem>
		{/snippet}

		{#snippet skeleton()}
			<ChatFormPickerListItemSkeleton showBadge titleWidth="w-32" />
		{/snippet}
	</ChatFormPickerList>
</ChatFormPickerPopover>
