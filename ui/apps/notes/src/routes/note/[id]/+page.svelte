<script lang="ts">
	import { Button } from '@ggml-org/llama-ui/ui/button';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import NoteScreen from '#lib/components/NoteScreen.svelte';
	import { notesStore } from '#lib/stores/notes.svelte.ts';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';

	let note = $derived(page.params.id ? notesStore.get(page.params.id) : undefined);
</script>

<div class="flex h-full flex-col">
	<div class="px-2 pt-2 md:hidden">
		<Button href={resolve('/')} size="sm" variant="ghost">
			<ChevronLeft />
			Notes
		</Button>
	</div>

	<div class="min-h-0 flex-1">
		{#if note}
			{#key note.id}
				<NoteScreen {note} />
			{/key}
		{:else if notesStore.loaded}
			<div class="flex h-full flex-col items-center justify-center gap-3 text-sm">
				<p class="text-muted-foreground">This note does not exist in this browser.</p>

				<Button href={resolve('/')} variant="outline">All notes</Button>
			</div>
		{/if}
	</div>
</div>
