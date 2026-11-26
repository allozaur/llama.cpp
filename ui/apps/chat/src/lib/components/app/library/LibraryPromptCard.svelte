<script lang="ts">
	import * as Card from '@ggml-org/llama-ui/ui/card';
	import { MessageSquare, MessageSquarePlus, MoreHorizontal, Pencil, Trash2 } from '@lucide/svelte';
	import {
		ContextMenuActions,
		DialogConfirmation,
		DropdownMenuActions
	} from '#lib/components/app/index.ts';
	import { KeyboardKey } from '#lib/enums/index.ts';
	import type { DatabasePrompt, MenuAction } from '#lib/types/index.ts';
	import { formatRelativeTime } from '#lib/utils/index.ts';

	interface Props {
		prompt: DatabasePrompt;
		onDelete: (prompt: DatabasePrompt) => void;
		onEdit: (prompt: DatabasePrompt) => void;
		/** Start a chat with the prompt attached to its first message. */
		onSend: (prompt: DatabasePrompt) => void;
		/** Start a chat with the prompt as its system message. */
		onUseAsSystemMessage: (prompt: DatabasePrompt) => void;
	}

	let { onDelete, onEdit, onSend, onUseAsSystemMessage, prompt }: Props = $props();

	let contextMenuOpen = $state(false);
	let confirmDeleteOpen = $state(false);

	// the "more actions" dropdown and the right-click menu offer the same actions
	const actions = $derived<MenuAction[]>([
		{ icon: MessageSquarePlus, label: 'Send in a new chat', onclick: () => onSend(prompt) },
		{
			icon: MessageSquare,
			label: 'As system message',
			onclick: () => onUseAsSystemMessage(prompt)
		},
		{ icon: Pencil, label: 'Edit prompt', onclick: () => onEdit(prompt), separator: true },
		{
			icon: Trash2,
			label: 'Delete',
			onclick: () => (confirmDeleteOpen = true),
			separator: true,
			variant: 'destructive'
		}
	]);

	function handleKeydown(event: KeyboardEvent) {
		if (event.key !== KeyboardKey.ENTER && event.key !== KeyboardKey.SPACE) return;

		event.preventDefault();
		onSend(prompt);
	}
</script>

<!-- the card starts a chat with the prompt; its menu holds the other ways to use it -->
<ContextMenuActions bind:open={contextMenuOpen} {actions}>
	<Card.Root
		class="group min-h-28 cursor-pointer !gap-0 p-5 transition-colors hover:bg-muted/50 {contextMenuOpen
			? 'bg-muted/50'
			: 'bg-muted/30'}"
		onclick={() => onSend(prompt)}
		onkeydown={handleKeydown}
		role="button"
		tabindex={0}
	>
		<div class="flex items-start gap-2">
			<h3 class="min-w-0 flex-1 truncate text-label">{prompt.name}</h3>

			<!-- the menu's clicks and keys stay in it, not starting a chat -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div
				class="shrink-0 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 max-md:opacity-100"
				onclick={(event) => event.stopPropagation()}
				onkeydown={(event) => event.stopPropagation()}
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
			<p class="mt-1 line-clamp-2 text-body-sm text-muted-foreground">{prompt.description}</p>
		{:else}
			<p class="mt-1 line-clamp-3 text-body-sm whitespace-pre-line text-muted-foreground">
				{prompt.content}
			</p>
		{/if}

		<p class="mt-auto pt-6 text-caption text-muted-foreground">
			Edited {formatRelativeTime(prompt.lastModified)}
		</p>
	</Card.Root>
</ContextMenuActions>

<DialogConfirmation
	confirmText="Delete"
	description="Messages made from it keep their text."
	onCancel={() => (confirmDeleteOpen = false)}
	onConfirm={() => {
		confirmDeleteOpen = false;
		onDelete(prompt);
	}}
	open={confirmDeleteOpen}
	title="Delete {prompt.name}?"
	variant="destructive"
/>
