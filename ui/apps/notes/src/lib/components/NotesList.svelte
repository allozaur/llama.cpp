<script lang="ts">
	import { Button } from '@ggml-org/llama-ui/ui/button';
	import Plus from '@lucide/svelte/icons/plus';
	import Trash from '@lucide/svelte/icons/trash-2';
	import { notesStore } from '#lib/stores/notes.svelte.ts';
	import { noteTitle } from '#lib/utils/note-title.ts';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';

	interface Props {
		class?: string;
	}

	let { class: className = '' }: Props = $props();

	let activeId = $derived(page.params.id);

	async function createNote() {
		const note = await notesStore.create();

		await goto(resolve('/note/[id]', { id: note.id }));
	}

	async function removeNote(id: string) {
		await notesStore.remove(id);

		if (id === activeId) await goto(resolve('/'));
	}
</script>

<nav aria-label="Notes" class="flex min-h-0 flex-col gap-2 {className}">
	<Button class="justify-start" onclick={createNote} variant="outline">
		<Plus />
		New note
	</Button>

	<ul class="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto">
		{#each notesStore.notes as note (note.id)}
			<li
				class="group flex items-center rounded-md hover:bg-muted {note.id === activeId
					? 'bg-muted'
					: ''}"
			>
				<a
					aria-current={note.id === activeId ? 'page' : undefined}
					class="min-w-0 flex-1 truncate px-3 py-2 text-sm"
					href={resolve('/note/[id]', { id: note.id })}
				>
					{noteTitle(note.content)}
				</a>

				<Button
					aria-label="Delete note"
					class="mr-1 size-7 shrink-0 p-0 opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 max-md:opacity-100"
					onclick={() => removeNote(note.id)}
					variant="ghost"
				>
					<Trash class="size-4" />
				</Button>
			</li>
		{:else}
			{#if notesStore.loaded}
				<li class="px-3 py-2 text-sm text-muted-foreground">No notes yet</li>
			{/if}
		{/each}
	</ul>
</nav>
