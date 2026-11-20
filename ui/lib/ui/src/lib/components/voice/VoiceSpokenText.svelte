<!--
	Text that is being spoken: what has been said so far in the full foreground colour, which it keeps, and the rest
	muted. Used for a transcript followed during playback (`spoken`, e.g. from spokenLength()), for a reply read aloud,
	and for text that streams in while someone speaks (`live`: each new word brightens as it arrives).
	Without `spoken` or `live` all of it reads as spoken. The words are plain text for screen readers.
	With `onWordSelect`, a click or tap on a word gives where it starts, e.g. to read on from there.
-->
<script lang="ts">
	import { cn } from '../ui/utils';
	import { spokenWords } from '../../voice/spoken';

	interface Props {
		text: string;
		/** Characters spoken so far; left out, all of them. */
		spoken?: number | null;
		/** Text arriving as it is said: new words come in muted and brighten. */
		live?: boolean;
		/** A word was clicked or tapped: where it starts in `text`. Selecting text is not a click. */
		onWordSelect?: (start: number) => void;
		class?: string;
	}

	let { class: className, live = false, onWordSelect, spoken = null, text }: Props = $props();

	function select(event: MouseEvent) {
		if (!onWordSelect || !(event.target instanceof Element)) return;

		// a drag that selected text is not a pick
		if (window.getSelection()?.isCollapsed === false) return;

		const start = event.target.closest<HTMLElement>('[data-start]')?.dataset.start;

		if (start !== undefined) onWordSelect(Number(start));
	}

	let words = $derived(spokenWords(text));
	let reached = $derived(spoken ?? text.length);
</script>

<!-- a pointer shortcut over plain text: the words stay text for screen readers and keyboards -->
<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
<span
	class={cn('whitespace-pre-wrap', className)}
	data-slot="voice-spoken-text"
	onclick={onWordSelect ? select : undefined}
	>{#each words as { start, word }, index (live ? index : start)}<span
			class={[
				'transition-colors duration-300 ease-out motion-reduce:transition-none',
				start < reached ? 'text-foreground' : 'text-muted-foreground',
				live && 'spoken-in',
				onWordSelect && 'cursor-pointer'
			]}
			data-spoken={start < reached || undefined}
			data-start={onWordSelect ? start : undefined}>{word}</span
		>{/each}</span
>

<style>
	@keyframes spoken-in {
		from {
			color: var(--fg-muted, currentColor);
		}
	}

	.spoken-in {
		animation: spoken-in 400ms ease-out;
	}

	@media (prefers-reduced-motion: reduce) {
		.spoken-in {
			animation: none;
		}
	}
</style>
