<script lang="ts">
	import '$lib/styles/katex-custom.scss';
	import { markdownLivePreview } from './markdown-live-preview';
	import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
	import { markdown, markdownKeymap, markdownLanguage } from '@codemirror/lang-markdown';
	import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
	import { EditorState, Prec, Transaction } from '@codemirror/state';
	import {
		EditorView,
		highlightActiveLine,
		keymap,
		placeholder as placeholderExt
	} from '@codemirror/view';
	import { tags } from '@lezer/highlight';
	import { DialogCodePreview } from '$lib/components/app';
	import { ColorMode } from '$lib/enums';
	import { loadHighlightTheme } from '$lib/utils';
	import { mode } from 'mode-watcher';
	import { onDestroy, onMount } from 'svelte';

	interface Props {
		class?: string;
		onChange?: (value: string) => void;
		onScroll?: () => void;
		placeholder?: string;
		scroller?: HTMLElement | null;
		value: string;
	}

	let {
		class: className = '',
		onChange,
		onScroll,
		placeholder = '',
		scroller = $bindable(null),
		value
	}: Props = $props();

	// The raw block being edited keeps the typography of its rendered version
	// (sizes and weights mirror markdown-content.css)
	const rawMarkdownStyle = HighlightStyle.define([
		{ fontSize: '1.875rem', fontWeight: '700', lineHeight: '1.2', tag: tags.heading1 },
		{ fontSize: '1.5rem', fontWeight: '600', lineHeight: '1.3', tag: tags.heading2 },
		{ fontSize: '1.25rem', fontWeight: '600', lineHeight: '1.4', tag: tags.heading3 },
		{ fontSize: '1.125rem', fontWeight: '600', tag: tags.heading4 },
		{ fontSize: '1rem', fontWeight: '600', tag: tags.heading5 },
		{ fontSize: '0.875rem', fontWeight: '600', tag: tags.heading6 },
		{ fontWeight: '600', tag: tags.strong },
		{ fontStyle: 'italic', tag: tags.emphasis },
		{ color: 'var(--muted-foreground)', fontStyle: 'italic', tag: tags.quote },
		{ opacity: '0.7', tag: tags.strikethrough, textDecoration: 'line-through' },
		{ fontFamily: 'var(--font-mono)', fontSize: '0.875rem', tag: tags.monospace }
	]);

	let host: HTMLDivElement;
	let view: EditorView | undefined;
	let previewCode = $state('');
	let previewLanguage = $state('text');
	let previewOpen = $state(false);

	onMount(() => {
		view = new EditorView({
			parent: host,
			state: EditorState.create({
				doc: value,
				extensions: [
					history(),
					// Shift+Enter belongs to the notebook (generate), not to a new line
					Prec.highest(keymap.of([{ key: 'Shift-Enter', run: () => true }])),
					keymap.of([...markdownKeymap, ...defaultKeymap, ...historyKeymap]),
					markdown({ base: markdownLanguage }),
					syntaxHighlighting(rawMarkdownStyle),
					markdownLivePreview({
						onPreviewCode: (code, language) => {
							previewCode = code;
							previewLanguage = language;
							previewOpen = true;
						}
					}),
					highlightActiveLine(),
					EditorView.lineWrapping,
					placeholderExt(placeholder),
					// Only report edits made by the user; syncs from `value` carry no user event
					EditorView.updateListener.of((update) => {
						const fromUser = update.transactions.some(
							(tr) => tr.annotation(Transaction.userEvent) !== undefined
						);

						if (update.docChanged && fromUser) onChange?.(update.state.doc.toString());
					}),
					EditorView.domEventHandlers({ scroll: () => onScroll?.() })
				]
			})
		});

		scroller = view.scrollDOM;
	});

	onDestroy(() => view?.destroy());

	// Sync external changes (streamed tokens, generation undo/redo) into the editor.
	// Pure appends are dispatched as an insert at the end so the viewport and selection survive.
	$effect(() => {
		const next = value;

		if (!view) return;

		const current = view.state.doc.toString();

		if (next === current) return;

		const changes = next.startsWith(current)
			? { from: current.length, insert: next.slice(current.length) }
			: { from: 0, insert: next, to: current.length };

		view.dispatch({ annotations: Transaction.addToHistory.of(false), changes });
	});

	$effect(() => {
		loadHighlightTheme(mode.current === ColorMode.DARK);
	});
</script>

<!-- markdown-content: rendered blocks get exactly the chat message styles -->
<div bind:this={host} class="markdown-content {className}"></div>

<DialogCodePreview
	code={previewCode}
	language={previewLanguage}
	onOpenChange={(open) => (previewOpen = open)}
	open={previewOpen}
/>

<style>
	@import '../content/MarkdownContent/markdown-content.css';

	div :global(.cm-editor) {
		height: 100%;
		background: transparent;
		color: inherit;
	}

	div :global(.cm-editor.cm-focused) {
		outline: none;
	}

	div :global(.cm-scroller) {
		/* top room so the first lines clear the sticky bar */
		padding: 5.5rem 1rem 3rem;
		font-family: inherit;
		line-height: 1.75;
	}

	/* Same text column as chat messages */
	div :global(.cm-content) {
		width: 100%;
		max-width: 48rem;
		margin: 0 auto;
		padding: 0;
		caret-color: var(--foreground);
	}

	div :global(.cm-line) {
		padding: 0;
	}

	div :global(.cm-placeholder) {
		color: var(--muted-foreground);
	}

	/* The markdown img styles must not reach the editor's invisible caret helpers */
	div :global(img.cm-widgetBuffer) {
		margin: 0 !important;
		box-shadow: none;
		height: 1em;
		width: 0;
	}

	/* Empty notebook: just the caret and the placeholder, like a textarea */
	div :global(.cm-activeLine:has(.cm-placeholder)) {
		background-color: transparent;
	}

	/* Line under the cursor: barely tinted, like our inputs */
	div :global(.cm-activeLine) {
		background-color: color-mix(in oklch, var(--muted) 50%, transparent);
	}

	/* Rendered block: margins come from the computed gap, so drop the outer ones */
	div :global(.cm-md-block) {
		display: flow-root;
		/* the editor's pre-wrap would turn the newlines between tags into blank lines */
		white-space: normal;
		cursor: text;
	}

	div :global(.cm-md-block > :first-child) {
		margin-top: 0 !important;
	}

	div :global(.cm-md-block > :last-child) {
		margin-bottom: 0 !important;
	}

	/* Raw code block being edited: the same box as a rendered code block */
	div :global(.cm-md-raw-code) {
		padding-inline: 1rem;
		font-family: var(--font-mono);
		font-size: 0.875rem;
		background: var(--code-background);
		border-inline: 1px solid color-mix(in oklch, var(--border) 30%, transparent);
	}

	div :global(.cm-md-raw-code.cm-activeLine) {
		background: color-mix(in oklch, var(--muted) 50%, var(--code-background));
	}

	div :global(.cm-md-raw-code-first) {
		padding-top: 0.75rem;
		border-top: 1px solid color-mix(in oklch, var(--border) 30%, transparent);
		border-radius: 0.75rem 0.75rem 0 0;
	}

	div :global(.cm-md-raw-code-last) {
		padding-bottom: 0.75rem;
		border-bottom: 1px solid color-mix(in oklch, var(--border) 30%, transparent);
		border-radius: 0 0 0.75rem 0.75rem;
	}
</style>
