<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import type { PromptDraft } from '$lib/stores/prompts.svelte';
	import type { DatabasePrompt } from '$lib/types';
	import { untrack } from 'svelte';

	interface Props {
		open?: boolean;
		/** The prompt to edit; a new one is made without it. */
		prompt?: DatabasePrompt;
		/** Text a new prompt starts with, e.g. the system message it is saved from. */
		initialContent?: string;
		/** Whether the text can be edited here; a system message saved as is shows it read-only. */
		contentEditable?: boolean;
		onSave: (draft: PromptDraft) => void | Promise<void>;
	}

	let {
		contentEditable = true,
		initialContent = '',
		onSave,
		open = $bindable(false),
		prompt
	}: Props = $props();

	let name = $state('');
	let description = $state('');
	let content = $state('');
	let nameInput = $state<HTMLInputElement | null>(null);

	// fresh fields every time the dialog opens, the prompt's own when editing
	$effect.pre(() => {
		if (!open) return;

		untrack(() => {
			name = prompt?.name ?? '';
			description = prompt?.description ?? '';
			content = prompt?.content ?? initialContent;
		});
	});

	const canSave = $derived(name.trim().length > 0 && content.trim().length > 0);

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();

		if (!canSave) return;

		open = false;

		await onSave({ content, description, name });
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content
		class="max-w-lg!"
		onOpenAutoFocus={(event) => {
			event.preventDefault();
			nameInput?.focus();
			nameInput?.select();
		}}
	>
		<Dialog.Header>
			<Dialog.Title>
				{prompt ? 'Edit prompt' : contentEditable ? 'New prompt' : 'Add to library'}
			</Dialog.Title>

			{#if !prompt && !contentEditable}
				<Dialog.Description>
					Save this system message as a prompt, to start other chats from it.
				</Dialog.Description>
			{/if}
		</Dialog.Header>

		<form class="contents" onsubmit={handleSubmit}>
			<div class="flex flex-col gap-4">
				<div class="flex flex-col gap-2">
					<Label for="prompt-name">Name</Label>

					<Input
						bind:ref={nameInput}
						bind:value={name}
						autocomplete="off"
						id="prompt-name"
						maxlength={200}
						placeholder="e.g. Code reviewer"
					/>
				</div>

				<div class="flex flex-col gap-2">
					<Label for="prompt-description">
						Description <span class="font-normal text-muted-foreground">(optional)</span>
					</Label>

					<Input
						bind:value={description}
						autocomplete="off"
						id="prompt-description"
						maxlength={300}
						placeholder="What it is for"
					/>
				</div>

				<div class="flex flex-col gap-2">
					<Label for="prompt-content">Prompt</Label>

					{#if contentEditable}
						<Textarea
							bind:value={content}
							class="max-h-80 min-h-32"
							id="prompt-content"
							placeholder="You are a helpful assistant who…"
						/>
					{:else}
						<div
							class="max-h-40 overflow-y-auto rounded-md border bg-muted/40 p-2 text-xs whitespace-pre-wrap"
							id="prompt-content"
						>
							{content}
						</div>
					{/if}
				</div>
			</div>

			<Dialog.Footer class="gap-2">
				<Button onclick={() => (open = false)} size="sm" variant="secondary">Cancel</Button>

				<Button disabled={!canSave} size="sm" type="submit">
					{prompt ? 'Save' : 'Add to library'}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
