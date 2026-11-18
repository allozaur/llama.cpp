<script lang="ts">
	import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
	import { markdown } from '@codemirror/lang-markdown';
	import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
	import {
		Annotation,
		Compartment,
		EditorState,
		type Extension,
		Transaction
	} from '@codemirror/state';
	import { EditorView, keymap, placeholder as placeholderExtension } from '@codemirror/view';
	import { tags } from '@lezer/highlight';
	import { onMount } from 'svelte';

	interface Props {
		class?: string;
		/** Extra CodeMirror extensions, ahead of the editor's own. */
		extensions?: Extension[];
		onChange?: (value: string) => void;
		placeholder?: string;
		readonly?: boolean;
		value: string;
	}

	let {
		class: className = '',
		extensions = [],
		onChange,
		placeholder = '',
		readonly = false,
		value
	}: Props = $props();

	// marks a change that came from `value`, which must not be reported back through onChange
	const external = Annotation.define<boolean>();
	const editable = new Compartment();
	const highlight = HighlightStyle.define([
		{ fontSize: '1.5em', fontWeight: '700', tag: tags.heading1 },
		{ fontSize: '1.25em', fontWeight: '700', tag: tags.heading2 },
		{ fontWeight: '700', tag: tags.heading },
		{ fontWeight: '700', tag: tags.strong },
		{ fontStyle: 'italic', tag: tags.emphasis },
		{ tag: tags.strikethrough, textDecoration: 'line-through' },
		{ color: 'var(--muted-foreground)', tag: [tags.processingInstruction, tags.meta, tags.quote] },
		{ fontFamily: 'var(--font-mono, monospace)', tag: tags.monospace },
		{ tag: [tags.link, tags.url], textDecoration: 'underline' }
	]);

	let host: HTMLDivElement | undefined = $state();
	let view: EditorView | undefined;

	/** Focus the editor with the cursor at the end of the text. */
	export function focusEnd() {
		if (!view) return;

		view.focus();
		view.dispatch({ selection: { anchor: view.state.doc.length } });
	}

	onMount(() => {
		if (!host) return;

		view = new EditorView({
			parent: host,
			state: EditorState.create({
				doc: value,
				extensions: [
					...extensions,
					history(),
					keymap.of([...defaultKeymap, ...historyKeymap]),
					markdown(),
					syntaxHighlighting(highlight),
					EditorView.lineWrapping,
					placeholderExtension(placeholder),
					editable.of(EditorView.editable.of(!readonly)),
					EditorView.updateListener.of((update) => {
						if (!update.docChanged) return;

						if (update.transactions.some((transaction) => transaction.annotation(external))) return;

						onChange?.(update.state.doc.toString());
					})
				]
			})
		});

		return () => view?.destroy();
	});

	// text that changed outside the editor (generated, undone or redone) goes in as one change
	$effect(() => {
		const next = value;

		if (!view) return;

		const current = view.state.doc.toString();

		if (next === current) return;

		let changes;

		if (next.startsWith(current)) {
			changes = { from: current.length, insert: next.slice(current.length) };
		} else if (current.startsWith(next)) {
			changes = { from: next.length, to: current.length };
		} else {
			changes = { from: 0, insert: next, to: current.length };
		}

		view.dispatch({
			annotations: [external.of(true), Transaction.addToHistory.of(false)],
			changes
		});
	});

	$effect(() => {
		view?.dispatch({ effects: editable.reconfigure(EditorView.editable.of(!readonly)) });
	});
</script>

<div bind:this={host} class="note-editor {className}"></div>

<style>
	.note-editor {
		line-height: 1.75;
	}

	.note-editor :global(.cm-editor) {
		background: transparent;
	}

	.note-editor :global(.cm-editor.cm-focused) {
		outline: none;
	}

	/* the editor grows with its text; the page around it scrolls */
	.note-editor :global(.cm-scroller) {
		overflow: visible;
		font-family: inherit;
	}

	.note-editor :global(.cm-content) {
		width: 100%;
		max-width: 48rem;
		margin: 0 auto;
		padding: 0;
		caret-color: var(--foreground);
	}

	.note-editor :global(.cm-line) {
		padding: 0;
	}

	.note-editor :global(.cm-placeholder) {
		color: var(--muted-foreground);
	}
</style>
