<script lang="ts">
	import * as Tooltip from '@ggml-org/llama-ui/ui/tooltip';
	import NoteScreen from '#lib/components/NoteScreen.svelte';
	import { notesStore } from '#lib/stores/notes.svelte.ts';

	interface Props {
		id: string;
	}

	let { id }: Props = $props();

	let note = $derived(notesStore.get(id));
</script>

<Tooltip.Provider>
	<div class="h-dvh">
		{#if note}
			<NoteScreen {note} />
		{/if}
	</div>
</Tooltip.Provider>
