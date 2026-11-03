<script lang="ts">
	import { ScanText } from '@lucide/svelte';
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { PromptDrift } from '$lib/enums';
	import type { DatabasePrompt } from '$lib/types';

	interface Props {
		open: boolean;
		prompt: DatabasePrompt;
		/** Text of the system message, saved to the prompt on confirm. */
		content: string;
		drift: PromptDrift;
		onConfirm: (name: string) => void;
		onSync: () => void;
		onCancel: () => void;
	}

	let { content, drift, onCancel, onConfirm, onSync, open = $bindable(), prompt }: Props = $props();

	let name = $state('');

	const canSubmit = $derived(name.trim().length > 0);

	$effect(() => {
		if (open) name = prompt.name;
	});

	function handleOpenChange(newOpen: boolean) {
		if (!newOpen) onCancel();
	}

	function handleSubmit(event: Event) {
		event.preventDefault();

		if (!canSubmit) return;

		onConfirm(name.trim());
	}
</script>

<AlertDialog.Root bind:open onOpenChange={handleOpenChange}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title class="flex items-center gap-2">
				<ScanText class="h-5 w-5" />
				Update prompt
			</AlertDialog.Title>

			<AlertDialog.Description>
				{#if drift === PromptDrift.LIBRARY}
					The prompt changed after this system message was written. Update the prompt with this
					message's text, or sync this message from the prompt.
				{:else}
					Save this system message's text back to the prompt in your library.
				{/if}
			</AlertDialog.Description>
		</AlertDialog.Header>

		<form class="space-y-3 pt-2 pb-4" onsubmit={handleSubmit}>
			<label class="text-sm font-medium text-muted-foreground" for="prompt-update-name">
				Prompt name
			</label>

			<Input
				bind:value={name}
				autocomplete="off"
				autocorrect="off"
				id="prompt-update-name"
				maxlength={200}
				placeholder="Prompt name"
				spellcheck={false}
			/>

			<div
				class="max-h-40 overflow-y-auto rounded-md border bg-muted/40 p-2 text-xs whitespace-pre-wrap"
			>
				{content}
			</div>
		</form>

		<AlertDialog.Footer>
			<AlertDialog.Cancel>Cancel</AlertDialog.Cancel>

			{#if drift === PromptDrift.LIBRARY}
				<Button onclick={onSync} type="button" variant="outline">Sync from library</Button>
			{/if}

			<Button disabled={!canSubmit} onclick={handleSubmit} type="button">Update library</Button>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
