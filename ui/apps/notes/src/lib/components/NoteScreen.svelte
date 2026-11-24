<script lang="ts">
	import ContextGauge from './ContextGauge.svelte';
	import GenerationStatistics from './GenerationStatistics.svelte';
	import ModelPicker from './ModelPicker.svelte';
	import NoteEditor from './NoteEditor.svelte';
	import ToolbarButton from './ToolbarButton.svelte';
	import { Prec } from '@codemirror/state';
	import { keymap } from '@codemirror/view';
	import * as AlertDialog from '@ggml-org/llama-ui/ui/alert-dialog';
	import Play from '@lucide/svelte/icons/play';
	import Redo from '@lucide/svelte/icons/redo';
	import Square from '@lucide/svelte/icons/square';
	import Undo from '@lucide/svelte/icons/undo';
	import {
		AUTO_SCROLL_AT_BOTTOM_THRESHOLD,
		AUTO_SCROLL_INTERVAL_MS
	} from '#lib/constants/index.ts';
	import { serverStore } from '#lib/stores/llama-server.svelte.ts';
	import { NoteSession } from '#lib/stores/note-session.svelte.ts';
	import { notesStore } from '#lib/stores/notes.svelte.ts';
	import type { Note } from '#lib/types/notes.ts';
	import { onDestroy, onMount } from 'svelte';

	interface Props {
		note: Note;
	}

	let { note }: Props = $props();

	const noteId = $derived(note.id);
	const session = new NoteSession({
		read: () => notesStore.get(noteId)?.content ?? '',
		write: (content) => notesStore.setContent(noteId, content)
	});
	// in the editor these keys act on the last generation first, then on the text
	const extensions = [
		Prec.highest(
			keymap.of([
				// Shift+Enter generates, it adds no line
				{ key: 'Shift-Enter', run: () => true },
				{ key: 'Mod-z', run: undoGeneration },
				{ key: 'Mod-y', run: redoGeneration },
				{ key: 'Mod-Shift-z', run: redoGeneration }
			])
		)
	];

	let editor: NoteEditor | undefined = $state();
	let scrollContainer: HTMLElement | undefined = $state();
	let followOutput = $state(true);
	let lastScrollTop = 0;

	let canGenerate = $derived(note.content.length > 0 && serverStore.canGenerate);
	let generateHint = $derived.by(() => {
		if (serverStore.error) return 'Cannot reach llama-server';

		if (!serverStore.canGenerate) return 'Select a model first';

		if (note.content.length === 0) return 'Write some text first';

		return undefined;
	});

	function undoGeneration(): boolean {
		if (!session.canUndo) return false;

		session.undo(serverStore.requestModel);

		return true;
	}

	function redoGeneration(): boolean {
		if (!session.canRedo) return false;

		session.redo(serverStore.requestModel);

		return true;
	}

	function handleChange(value: string) {
		notesStore.setContent(noteId, value);
		session.edited(serverStore.requestModel);
	}

	async function generate() {
		if (!canGenerate) return;

		followOutput = true;
		scrollToBottom();

		await session.generate(serverStore.requestModel);

		// a routing server loads the model for the request: its context size is known now
		if (serverStore.isRouter && serverStore.contextSize === null) {
			await serverStore.refreshModelProps();
		}
	}

	function scrollToBottom(behavior: ScrollBehavior = 'smooth') {
		scrollContainer?.scrollTo({ behavior, top: scrollContainer.scrollHeight });
	}

	function handleScroll() {
		if (!scrollContainer) return;

		const { clientHeight, scrollHeight, scrollTop } = scrollContainer;
		const atBottom = scrollHeight - scrollTop - clientHeight < AUTO_SCROLL_AT_BOTTOM_THRESHOLD;

		// scrolling up lets go of the output; reaching the bottom again follows it
		if (scrollTop < lastScrollTop && !atBottom) {
			followOutput = false;
		} else if (atBottom) {
			followOutput = true;
		}

		lastScrollTop = scrollTop;
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.shiftKey && event.key === 'Enter') {
			event.preventDefault();

			if (session.isGenerating) {
				session.stop();
			} else {
				void generate();
			}

			return;
		}

		// the focused editor took it
		if (event.defaultPrevented || !(event.ctrlKey || event.metaKey)) return;

		const key = event.key.toLowerCase();

		if (key === 'z' && !event.shiftKey && undoGeneration()) event.preventDefault();

		if ((key === 'y' || (key === 'z' && event.shiftKey)) && redoGeneration()) {
			event.preventDefault();
		}
	}

	$effect(() => {
		if (!session.isGenerating || !followOutput) return;

		const interval = setInterval(() => scrollToBottom(), AUTO_SCROLL_INTERVAL_MS);

		return () => clearInterval(interval);
	});

	// the token count needs the model a routing server tokenizes with
	$effect(() => {
		if (
			serverStore.loaded &&
			!serverStore.error &&
			(!serverStore.isRouter || serverStore.selectedModel)
		) {
			session.scheduleTokenCount(serverStore.requestModel);
		}
	});

	onMount(() => {
		if (note.content.length === 0) editor?.focusEnd();
	});

	onDestroy(() => {
		session.dispose();
		void notesStore.flush(noteId);
	});
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- a click on the empty page below the text continues writing at its end -->
<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
<div
	bind:this={scrollContainer}
	class="flex h-full flex-col overflow-y-auto px-4 pt-8"
	onclick={(event) => {
		if (event.target === event.currentTarget) editor?.focusEnd();
	}}
	onscroll={handleScroll}
>
	<NoteEditor
		bind:this={editor}
		class="w-full min-w-0"
		{extensions}
		onChange={handleChange}
		placeholder="Write, then let the model continue..."
		readonly={session.isGenerating}
		value={note.content}
	/>

	<!-- right under the text; once the text outgrows the page it sticks to the bottom edge -->
	<div class="pointer-events-none sticky bottom-0 z-10 mt-auto flex justify-center py-4">
		<div
			aria-label="Generation"
			class="pointer-events-auto flex w-full max-w-3xl items-center gap-1.5 rounded-full border border-border/40 bg-muted/60 px-2 py-1.5 backdrop-blur-md"
			role="toolbar"
		>
			<ToolbarButton
				disabled={!session.canUndo}
				label="Undo last generation"
				onclick={undoGeneration}
				shortcut={['mod', 'z']}
			>
				<Undo />
			</ToolbarButton>

			<ToolbarButton
				disabled={!session.canRedo}
				label="Redo last generation"
				onclick={redoGeneration}
				shortcut={['mod', 'y']}
			>
				<Redo />
			</ToolbarButton>

			<div class="ml-auto flex min-w-0 items-center gap-1.5">
				<div class="hidden md:block">
					<GenerationStatistics isGenerating={session.isGenerating} stats={session.stats} />
				</div>

				<ContextGauge total={serverStore.contextSize} used={session.totalTokens} />

				<ModelPicker disabled={session.isGenerating} />

				{#if session.isGenerating}
					<ToolbarButton
						label="Stop"
						onclick={() => session.stop()}
						shortcut={['shift', 'enter']}
						variant="secondary"
					>
						<Square class="fill-current" />
					</ToolbarButton>
				{:else}
					<ToolbarButton
						disabled={!canGenerate}
						hint={generateHint}
						label="Generate"
						onclick={generate}
						shortcut={['shift', 'enter']}
						variant="default"
					>
						<Play class="fill-current" />
					</ToolbarButton>
				{/if}
			</div>
		</div>
	</div>
</div>

<AlertDialog.Root
	onOpenChange={(open) => {
		if (!open) session.dismissError();
	}}
	open={session.error !== null}
>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>Generation failed</AlertDialog.Title>

			<AlertDialog.Description>{session.error}</AlertDialog.Description>
		</AlertDialog.Header>

		<AlertDialog.Footer>
			<AlertDialog.Action onclick={() => session.dismissError()}>OK</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
