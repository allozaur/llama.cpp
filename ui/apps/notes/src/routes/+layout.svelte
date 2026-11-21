<script lang="ts">
	import '../app.css';
	import * as Tooltip from '@ggml-org/llama-ui/ui/tooltip';
	import NotesList from '#lib/components/NotesList.svelte';
	import { TOOLTIP_DELAY_MS } from '#lib/constants/index.ts';
	import { serverStore } from '#lib/stores/llama-server.svelte.ts';
	import { notesStore } from '#lib/stores/notes.svelte.ts';
	import { ModeWatcher } from 'mode-watcher';
	import { onMount } from 'svelte';

	let { children } = $props();

	onMount(() => {
		void notesStore.load();
		void serverStore.init();
	});
</script>

<svelte:head>
	<title>Llama Notes</title>
</svelte:head>

<ModeWatcher />

<Tooltip.Provider delayDuration={TOOLTIP_DELAY_MS}>
	<div class="flex h-dvh bg-background text-foreground">
		<aside class="hidden w-64 shrink-0 flex-col border-r border-border/40 bg-muted/40 p-3 md:flex">
			<NotesList class="flex-1" />
		</aside>

		<main class="min-w-0 flex-1">
			{@render children()}
		</main>
	</div>
</Tooltip.Provider>
