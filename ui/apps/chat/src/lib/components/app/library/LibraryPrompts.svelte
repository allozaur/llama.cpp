<script lang="ts">
	import LibraryPromptCard from './LibraryPromptCard.svelte';
	import { Button } from '@ggml-org/llama-ui/ui/button';
	import * as Empty from '@ggml-org/llama-ui/ui/empty';
	import { Skeleton } from '@ggml-org/llama-ui/ui/skeleton';
	import { Plus, SearchX } from '@lucide/svelte';
	import { DialogPrompt } from '#lib/components/app/index.ts';
	import { PROMPT_ICON } from '#lib/constants/index.ts';
	import {
		chatStore,
		conversationsStore,
		draftMessagesStore,
		promptsStore
	} from '#lib/stores/index.ts';
	import type { PromptDraft } from '#lib/stores/prompts.svelte.ts';
	import type { DatabasePrompt } from '#lib/types/index.ts';
	import { promptToUploadedFile } from '#lib/utils/index.ts';

	interface Props {
		query?: string;
		/** Set by the page's New prompt button, to open the dialog for a new prompt. */
		creating?: boolean;
	}

	let { creating = $bindable(false), query = '' }: Props = $props();

	/** Placeholder cards while the prompts table is read. */
	const PROMPT_CARD_SKELETONS = 3;

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

	/** A new chat with the prompt attached to the message being written, as `/prompt` leaves it. */
	async function send(prompt: DatabasePrompt) {
		const draft = draftMessagesStore.getDraftMessage(undefined);

		draftMessagesStore.saveDraftMessage(undefined, draft.message, [
			...draft.files,
			promptToUploadedFile(prompt)
		]);

		await conversationsStore.openNewChat({ inNewTab: true });
	}

	/** A new chat whose system message is the prompt, as the System message list leaves it. */
	async function useAsSystemMessage(prompt: DatabasePrompt) {
		await conversationsStore.openNewChat({ inNewTab: true });
		await chatStore.saveSystemPrompt(prompt.content, { name: prompt.name, promptId: prompt.id });
	}

	$effect(() => {
		if (!creating) return;

		creating = false;
		editing = undefined;
		editOpen = true;
	});
</script>

{#if !promptsStore.isInitialized}
	<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
		{#each { length: PROMPT_CARD_SKELETONS } as _, index (index)}
			<Skeleton class="h-28 rounded-xl" />
		{/each}
	</div>
{:else if promptsStore.prompts.length === 0}
	<Empty.Root class="border py-16">
		<Empty.Header>
			<Empty.Media variant="icon">
				<PROMPT_ICON />
			</Empty.Media>

			<Empty.Title>Save your first prompt</Empty.Title>

			<Empty.Description>
				Keep the prompts you reuse. Send one in a chat with /prompt, or use it as a chat's system
				message. A system message written in a chat can be added here with its "Add to library"
				link.
			</Empty.Description>
		</Empty.Header>

		<Empty.Content>
			<Button onclick={() => (creating = true)} size="sm">
				<Plus class="size-icon-md" />

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
				onSend={(p) => void send(p)}
				onUseAsSystemMessage={(p) => void useAsSystemMessage(p)}
				{prompt}
			/>
		{/each}
	</div>
{/if}

<DialogPrompt bind:open={editOpen} onSave={handleSave} prompt={editing} />
