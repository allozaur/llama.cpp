<script lang="ts">
	import { MessageSquarePlus, MoreHorizontal, Pencil, Trash2 } from '@lucide/svelte';
	import { ContextMenuActions, DialogConfirmation, DropdownMenuActions } from '$lib/components/app';
	import * as Card from '$lib/components/ui/card';
	import type { DatabasePrompt, MenuAction } from '$lib/types';
	import { formatRelativeTime } from '$lib/utils';

	interface Props {
		prompt: DatabasePrompt;
		onDelete: (prompt: DatabasePrompt) => void;
		onEdit: (prompt: DatabasePrompt) => void;
		onStartChat: (prompt: DatabasePrompt) => void;
	}

	let { onDelete, onEdit, onStartChat, prompt }: Props = $props();

	let contextMenuOpen = $state(false);
	let confirmDeleteOpen = $state(false);

	// the "more actions" dropdown and the right-click menu offer the same actions
	const actions = $derived<MenuAction[]>([
		{ icon: MessageSquarePlus, label: 'New chat', onclick: () => onStartChat(prompt) },
		{ icon: Pencil, label: 'Edit prompt', onclick: () => onEdit(prompt) },
		{
			icon: Trash2,
			label: 'Delete',
			onclick: () => (confirmDeleteOpen = true),
			separator: true,
			variant: 'destructive'
		}
	]);

	function handleKeydown(event: KeyboardEvent) {
		if (event.key !== 'Enter' && event.key !== ' ') return;

		event.preventDefault();
		onStartChat(prompt);
	}
</script>

<!-- the card starts a chat with the prompt, like a project card opens its project -->
<ContextMenuActions bind:open={contextMenuOpen} {actions}>
	<Card.Root
		class="group !gap-0 min-h-28 cursor-pointer p-5 transition-colors hover:bg-muted/50 {contextMenuOpen
			? 'bg-muted/50'
			: 'bg-muted/30'}"
		onclick={() => onStartChat(prompt)}
		onkeydown={handleKeydown}
		role="button"
		tabindex={0}
	>
		<div class="flex items-start gap-2">
			<h3 class="min-w-0 flex-1 truncate font-medium">{prompt.name}</h3>

			<!-- the menu's clicks stay in it, not starting a chat -->
			<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
			<div
				class="shrink-0 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 max-md:opacity-100"
				onclick={(event) => event.stopPropagation()}
			>
				<DropdownMenuActions
					{actions}
					triggerIcon={MoreHorizontal}
					triggerTooltip="Prompt actions"
				/>
			</div>
		</div>

		<!-- a description says what the prompt is for, else its own first lines do -->
		{#if prompt.description}
			<p class="mt-1 line-clamp-2 text-sm text-muted-foreground">{prompt.description}</p>
		{:else}
			<p class="mt-1 line-clamp-3 text-sm whitespace-pre-line text-muted-foreground">
				{prompt.content}
			</p>
		{/if}

		<p class="mt-auto pt-6 text-sm text-muted-foreground">
			Edited {formatRelativeTime(prompt.lastModified)}
		</p>
	</Card.Root>
</ContextMenuActions>

<DialogConfirmation
	confirmText="Delete"
	description="System messages made from it keep their text."
	onCancel={() => (confirmDeleteOpen = false)}
	onConfirm={() => {
		confirmDeleteOpen = false;
		onDelete(prompt);
	}}
	open={confirmDeleteOpen}
	title="Delete {prompt.name}?"
	variant="destructive"
/>
