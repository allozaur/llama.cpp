<script lang="ts">
	import { MessageSquare, Plus } from '@lucide/svelte';
	import { McpLogo } from '$lib/components/app';
	import SearchInput from '$lib/components/app/forms/SearchInput.svelte';
	import Badge from '$lib/components/ui/badge/badge.svelte';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { getChatFormActionsContext } from '$lib/contexts';
	import { useSystemMessagePrompts } from '$lib/hooks/use-system-message-prompts.svelte';
	import type { MCPPromptInfo } from '$lib/types';

	interface Props {
		onWriteNew?: () => void;
	}

	let { onWriteNew }: Props = $props();

	const chatFormActions = getChatFormActionsContext();

	let subOpen = $state(false);

	const prompts = useSystemMessagePrompts({
		onMcpPromptArguments: (prompt: MCPPromptInfo) => {
			subOpen = false;
			chatFormActions.onMcpPromptClick?.(prompt);
		},
		onPromptSelect: (content, promptId, title) => {
			chatFormActions.onSystemPromptWithContent?.(content, promptId, title);
		}
	});

	$effect(() => {
		if (subOpen) void prompts.loadMcpPrompts();
	});
</script>

<DropdownMenu.Sub bind:open={subOpen}>
	<DropdownMenu.SubTrigger class="flex cursor-pointer items-center gap-2">
		<MessageSquare class="h-4 w-4" />

		<span>System message</span>
	</DropdownMenu.SubTrigger>

	<DropdownMenu.SubContent class="w-72">
		{#if prompts.hasPrompts}
			<div class="mb-1.5">
				<SearchInput
					bind:value={prompts.searchQuery}
					placeholder="Search by name, content, or server..."
					size="sm"
				/>
			</div>
		{/if}

		<DropdownMenu.Item
			class="mt-2.5 mb-2 flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-2 text-left transition-colors hover:bg-accent"
			onclick={() => onWriteNew?.()}
		>
			<Plus class="h-4 w-4" />

			<span>Write new</span>
		</DropdownMenu.Item>

		{#if prompts.libraryPrompts.length > 0}
			<DropdownMenu.Separator />

			<DropdownMenu.Label class="mt-1.5 mb-1">Your prompts</DropdownMenu.Label>

			{#each prompts.libraryPrompts as prompt (prompt.id)}
				<DropdownMenu.Item
					class="flex w-full cursor-pointer flex-col items-start gap-0.5 rounded-sm px-2 py-2 text-left transition-colors hover:bg-accent"
					onclick={() => prompts.selectLibraryPrompt(prompt.id)}
				>
					<span class="line-clamp-1 text-sm font-medium">{prompt.name}</span>

					{#if prompt.description}
						<span class="line-clamp-1 w-full text-xs leading-5 text-muted-foreground">
							{prompt.description}
						</span>
					{/if}

					<span class="line-clamp-3 w-full text-xs leading-5 text-muted-foreground">
						{prompt.content}
					</span>
				</DropdownMenu.Item>
			{/each}
		{/if}

		{#if prompts.mcpEntries.length > 0}
			<DropdownMenu.Separator />

			<DropdownMenu.Label class="mt-1.5 mb-1">MCP Prompts</DropdownMenu.Label>

			{#each prompts.mcpEntries as entry (entry.prompt.serverName + entry.prompt.name)}
				<DropdownMenu.Item
					class="flex w-full cursor-pointer flex-col items-start gap-0.5 rounded-sm px-2 py-2 text-left transition-colors hover:bg-accent"
					onclick={() => prompts.selectMcpPrompt(entry)}
				>
					<div class="flex w-full items-center gap-1.5">
						{#if entry.faviconUrl}
							<img
								alt=""
								class="h-3 w-3 shrink-0 rounded-sm"
								onerror={(e) => {
									(e.currentTarget as HTMLImageElement).style.display = 'none';
								}}
								src={entry.faviconUrl}
							/>
						{:else}
							<McpLogo class="h-3 w-3 shrink-0" />
						{/if}

						<span class="truncate text-xs text-muted-foreground">{entry.serverLabel}</span>

						{#if entry.prompt.arguments?.length}
							<Badge class="ml-auto shrink-0 text-[10px]" variant="secondary">
								{entry.prompt.arguments.length} arg{entry.prompt.arguments.length > 1 ? 's' : ''}
							</Badge>
						{/if}
					</div>

					<span class="line-clamp-1 text-sm font-medium">
						{entry.prompt.title || entry.prompt.name}
					</span>

					{#if entry.prompt.description}
						<span class="line-clamp-2 w-full text-xs leading-5 text-muted-foreground">
							{entry.prompt.description}
						</span>
					{/if}
				</DropdownMenu.Item>
			{/each}
		{/if}

		{#if prompts.hasNoMatches}
			<div class="px-2 py-2 text-xs text-muted-foreground">No matches</div>
		{/if}
	</DropdownMenu.SubContent>
</DropdownMenu.Sub>
