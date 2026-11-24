<script lang="ts">
	import AgentImport from './AgentImport.svelte';
	import * as Dialog from '@ggml-org/llama-ui/ui/dialog';

	let { open = $bindable(false) }: { open: boolean } = $props();
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg">
		<Dialog.Title class="sr-only">Import chats from other AI apps</Dialog.Title>

		<Dialog.Description class="sr-only">
			Pick the session files of another app and import them as conversations.
		</Dialog.Description>

		<!-- remounted on each open, so the flow starts from its first screen -->
		{#if open}
			<AgentImport onDone={() => (open = false)} onSkip={() => (open = false)} />
		{/if}
	</Dialog.Content>
</Dialog.Root>
