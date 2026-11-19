import { notesStore } from '#lib/stores/notes.svelte.ts';
import { goto } from '$app/navigation';
import { resolve } from '$app/paths';

/** Opens Markdown files as notes, picked or dropped, and shows the first of them. */
export async function openNotes(source: DataTransfer | 'picker' = 'picker'): Promise<void> {
	const [first] = await notesStore.open(source);

	if (first) await goto(resolve('/note/[id]', { id: first.id }));
}
