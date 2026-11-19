<script lang="ts">
	import '../app.css';
	import * as AlertDialog from '@ggml-org/llama-ui/ui/alert-dialog';
	import * as Tooltip from '@ggml-org/llama-ui/ui/tooltip';
	import NotesList from '#lib/components/NotesList.svelte';
	import { TOOLTIP_DELAY_MS } from '#lib/constants/index.ts';
	import { serverStore } from '#lib/stores/llama-server.svelte.ts';
	import { notesStore } from '#lib/stores/notes.svelte.ts';
	import { openNotes } from '#lib/utils/open-notes.ts';
	import { ModeWatcher } from 'mode-watcher';
	import { onMount } from 'svelte';

	let { children } = $props();

	let isDraggingFiles = $state(false);

	const carriesFiles = (event: DragEvent) => event.dataTransfer?.types.includes('Files') ?? false;

	function handleKeydown(event: KeyboardEvent) {
		if (
			(event.metaKey || event.ctrlKey) &&
			!event.shiftKey &&
			!event.altKey &&
			event.key.toLowerCase() === 'o'
		) {
			event.preventDefault();
			void openNotes();
		}
	}

	// Files dropped anywhere, the editor too, open as notes: taken on the way down, before
	// the editor would paste their text in
	function handleDragOver(event: DragEvent) {
		if (!carriesFiles(event)) return;

		event.preventDefault();
		event.stopPropagation();
		event.dataTransfer!.dropEffect = 'copy';
		isDraggingFiles = true;
	}

	function handleDragLeave(event: DragEvent) {
		// only when the drag leaves the window, not each element on the way
		if (event.relatedTarget === null) isDraggingFiles = false;
	}

	function handleDrop(event: DragEvent) {
		if (!carriesFiles(event)) return;

		event.preventDefault();
		event.stopPropagation();
		isDraggingFiles = false;
		void openNotes(event.dataTransfer!);
	}

	onMount(() => {
		void notesStore.load();
		void serverStore.init();
	});
</script>

<svelte:window onkeydown={handleKeydown} />

<svelte:head>
	<title>Llama Notes</title>
</svelte:head>

<ModeWatcher />

<Tooltip.Provider delayDuration={TOOLTIP_DELAY_MS}>
	<div
		class="flex h-dvh bg-background text-foreground"
		ondragleave={handleDragLeave}
		ondragovercapture={handleDragOver}
		ondropcapture={handleDrop}
		role="presentation"
	>
		<aside class="hidden w-64 shrink-0 flex-col border-r border-border/40 bg-muted/40 p-3 md:flex">
			<NotesList class="flex-1" />
		</aside>

		<main class="min-w-0 flex-1">
			{@render children()}
		</main>
	</div>

	{#if isDraggingFiles}
		<div
			class="pointer-events-none fixed inset-3 z-50 flex items-center justify-center rounded-xl border-2 border-dashed border-border bg-background/80 text-sm text-muted-foreground backdrop-blur-sm"
		>
			Drop Markdown files to open them as notes
		</div>
	{/if}
</Tooltip.Provider>

<AlertDialog.Root
	onOpenChange={(open) => {
		if (!open) notesStore.dismissFileError();
	}}
	open={notesStore.fileError !== null}
>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>
				{notesStore.fileError?.action === 'save'
					? 'Could not save the note'
					: 'Could not open the file'}
			</AlertDialog.Title>

			<AlertDialog.Description>{notesStore.fileError?.message}</AlertDialog.Description>
		</AlertDialog.Header>

		<AlertDialog.Footer>
			<AlertDialog.Action onclick={() => notesStore.dismissFileError()}>OK</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
