<script lang="ts">
	import { SearchInput } from '@ggml-org/llama-ui/app/forms';
	import { Badge } from '@ggml-org/llama-ui/ui/badge';
	import * as DropdownMenu from '@ggml-org/llama-ui/ui/dropdown-menu';
	import { MessageSquare, Plus } from '@lucide/svelte';
	import { ChatFormPickerPromptOrigin } from '#lib/components/app/index.ts';
	import {
		ATTACHMENT_MENU_TEXT,
		ICON_CLASS_DEFAULT,
		PROMPT_SEARCH_MIN_ITEMS
	} from '#lib/constants/index.ts';
	import { getChatFormActionsContext } from '#lib/contexts/index.ts';
	import { usePromptList } from '#lib/hooks/use-prompt-list.svelte.ts';

	interface Props {
		onWriteNew?: () => void;
	}

	let { onWriteNew }: Props = $props();

	const chatFormActions = getChatFormActionsContext();
	const prompts = usePromptList();

	let subOpen = $state(false);

	// opening the list is the need for the prompts
	$effect(() => {
		if (subOpen) void prompts.load();
	});
</script>

<DropdownMenu.Sub bind:open={subOpen}>
	<DropdownMenu.SubTrigger class="flex cursor-pointer items-center gap-2">
		<MessageSquare class={ICON_CLASS_DEFAULT} />

		<span>{ATTACHMENT_MENU_TEXT.SYSTEM_MESSAGE}</span>
	</DropdownMenu.SubTrigger>

	<DropdownMenu.SubContent class="w-72 p-0">
		{#if prompts.total >= PROMPT_SEARCH_MIN_ITEMS}
			<!-- keys typed here search the list: the menu's own typeahead stays out of it -->
			<div class="p-2 pb-0" onkeydown={(event) => event.stopPropagation()} role="presentation">
				<SearchInput bind:value={prompts.searchQuery} placeholder="Search prompts..." size="sm" />
			</div>
		{/if}

		<div class="max-h-80 overflow-y-auto p-2 pr-1">
			<DropdownMenu.Item class="cursor-pointer" onclick={() => onWriteNew?.()}>
				<Plus class={ICON_CLASS_DEFAULT} />

				<span>{ATTACHMENT_MENU_TEXT.WRITE_SYSTEM_MESSAGE}</span>
			</DropdownMenu.Item>

			{#each prompts.groups as group (group.source.id)}
				<DropdownMenu.Separator />

				<DropdownMenu.Label>{group.source.label}</DropdownMenu.Label>

				{#each group.entries as entry (entry.id)}
					<DropdownMenu.Item
						class="cursor-pointer flex-col items-start gap-0.5"
						onclick={() => chatFormActions.onSystemPromptSelect?.(group.source, entry)}
					>
						<!-- the library's prompts sit under its own heading: only another origin is named -->
						{#if entry.origin !== group.source.label}
							<span class="flex w-full items-center gap-1.5">
								<ChatFormPickerPromptOrigin {entry} source={group.source} />

								{#if entry.argumentCount > 0}
									<Badge class="ml-auto shrink-0" variant="secondary">
										{entry.argumentCount} arg{entry.argumentCount > 1 ? 's' : ''}
									</Badge>
								{/if}
							</span>
						{/if}

						<span class="line-clamp-1 text-label">{entry.title}</span>

						{#if entry.description}
							<span class="line-clamp-2 w-full text-caption text-muted-foreground">
								{entry.description}
							</span>
						{/if}
					</DropdownMenu.Item>
				{/each}
			{/each}

			{#if prompts.total > 0 && prompts.groups.length === 0}
				<div class="p-2 text-caption text-muted-foreground">No matching prompt</div>
			{/if}
		</div>
	</DropdownMenu.SubContent>
</DropdownMenu.Sub>
