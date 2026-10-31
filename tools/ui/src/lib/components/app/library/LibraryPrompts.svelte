<script lang="ts">
	import LibraryPromptCard from './LibraryPromptCard.svelte';
	import { Plus, ScanText, SearchX } from '@lucide/svelte';
	import { DialogPrompt } from '$lib/components/app';
	import { Button } from '$lib/components/ui/button';
	import * as Empty from '$lib/components/ui/empty';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { chatStore, conversationsStore, promptsStore } from '$lib/stores';
	import type { PromptDraft } from '$lib/stores/prompts.svelte';
	import type { DatabasePrompt } from '$lib/types';

	interface Props {
		query?: string;
		/** Set by the page's New prompt button, to open the dialog for a new prompt. */
		creating?: boolean;
	}

	let { creating = $bindable(false), query = '' }: Props = $props();

	/** Placeholder cards while the prompts table is read. */
	const PROMPT_CARD_SKELETONS = [0, 1, 2];

	let editing = $state<DatabasePrompt | undefined>(undefined);
	let editOpen = $state(false);

	// the most recently edited first, as the store keeps them
	let prompts = $derived(promptsStore.search(query));

	function edit(prompt: DatabasePrompt) {
		editing = prompt;
		editOpen = true;
	}

	async function handleSave(draft: PromptDraft) {
		if (editing) {
			await promptsStore.update(editing.id, draft);
		} else {
			await promptsStore.add(draft);
		}
	}

	// a new chat whose system message is the prompt, linked to it
	async function startChat(prompt: DatabasePrompt) {
		await conversationsStore.createConversation();
		await chatStore.addSystemPromptFromPrompt(prompt.content, {
			promptId: prompt.id,
			title: prompt.name
		});
	}

	$effect(() => {
		if (!creating) return;

		creating = false;
		editing = undefined;
		editOpen = true;
	});
</script>

{#if !promptsStore.isInitialized && promptsStore.prompts.length === 0}
	<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
		{#each PROMPT_CARD_SKELETONS as index (index)}
			<Skeleton class="h-28 rounded-xl" />
		{/each}
	</div>
{:else if promptsStore.prompts.length === 0}
	<Empty.Root class="border py-16">
		<Empty.Header>
			<Empty.Media variant="icon">
				<ScanText />
			</Empty.Media>

			<Empty.Title>Save your first prompt</Empty.Title>

			<Empty.Description>
				Keep system messages you reuse, and start chats from them. A system message in a chat can be
				added here with its "Add to library" link.
			</Empty.Description>
		</Empty.Header>

		<Empty.Content>
			<Button onclick={() => (creating = true)} size="sm">
				<Plus class="h-4 w-4" />
				New prompt
			</Button>
		</Empty.Content>
	</Empty.Root>
{:else if prompts.length === 0}
	<Empty.Root class="border py-16">
		<Empty.Header>
			<Empty.Media variant="icon">
				<SearchX />
			</Empty.Media>

			<Empty.Title>No prompts match</Empty.Title>

			<Empty.Description>Try another search.</Empty.Description>
		</Empty.Header>
	</Empty.Root>
{:else}
	<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
		{#each prompts as prompt (prompt.id)}
			<LibraryPromptCard
				onDelete={(p) => void promptsStore.remove(p.id)}
				onEdit={edit}
				onStartChat={(p) => void startChat(p)}
				{prompt}
			/>
		{/each}
	</div>
{/if}

<DialogPrompt bind:open={editOpen} onSave={handleSave} prompt={editing} />
