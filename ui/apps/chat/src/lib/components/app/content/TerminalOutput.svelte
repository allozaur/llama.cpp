<script lang="ts">
	// Terminal-like view of a command's output: monospace, ANSI colours, and
	// pinned to the newest line until the user scrolls up.

	import { cn } from '@ggml-org/llama-ui/utils';
	import { TOOL_RUNTIME_SCROLL_AT_BOTTOM_THRESHOLD_PX } from '#lib/constants/index.ts';
	import { type AnsiStyle, parseAnsi } from '#lib/utils/index.ts';

	interface Props {
		class?: string;
		/** Shown when there is no output yet. */
		emptyText?: string;
		/** Keep the newest line in view while output arrives. */
		follow?: boolean;
		output: string;
	}

	let { class: className, emptyText = 'No output yet', follow = true, output }: Props = $props();

	const runs = $derived(parseAnsi(output));

	let scrollEl: HTMLDivElement | undefined = $state();
	let pinned = $state(true);

	function colour(value: number | string | undefined): string | undefined {
		if (value === undefined) return undefined;

		return typeof value === 'number' ? `var(--ansi-${value})` : value;
	}

	function styleOf(style: AnsiStyle): string | undefined {
		const parts: string[] = [];
		const fg = colour(style.fg);
		const bg = colour(style.bg);

		if (fg) parts.push(`color: ${fg}`);

		if (bg) parts.push(`background-color: ${bg}`);

		if (style.bold) parts.push('font-weight: 600');

		if (style.dim) parts.push('opacity: 0.65');

		if (style.italic) parts.push('font-style: italic');

		if (style.underline) parts.push('text-decoration: underline');

		return parts.length > 0 ? parts.join('; ') : undefined;
	}

	function handleScroll() {
		if (!scrollEl) return;

		pinned =
			scrollEl.scrollHeight - scrollEl.clientHeight - scrollEl.scrollTop <=
			TOOL_RUNTIME_SCROLL_AT_BOTTOM_THRESHOLD_PX;
	}

	$effect(() => {
		void runs;

		if (!scrollEl || !follow || !pinned) return;

		const el = scrollEl;
		const frame = requestAnimationFrame(() => (el.scrollTop = el.scrollHeight));

		return () => cancelAnimationFrame(frame);
	});
</script>

<div
	bind:this={scrollEl}
	class={cn('terminal-output overflow-auto font-mono text-caption leading-relaxed', className)}
	onscroll={handleScroll}
	role="log"
>
	{#if output}
		<pre class="whitespace-pre-wrap break-words">{#each runs as run, i (i)}<span
					style={styleOf(run.style)}>{run.text}</span
				>{/each}</pre>
	{:else}
		<p class="text-muted-foreground/70 italic">{emptyText}</p>
	{/if}
</div>

<style>
	/* the 16 ANSI colours, from the status tokens so they follow the theme */
	.terminal-output {
		--ansi-red: var(--fg-danger);
		--ansi-green: var(--fg-success);
		--ansi-yellow: var(--fg-warning);
		--ansi-blue: var(--fg-info);
		--ansi-magenta: color-mix(in oklch, var(--fg-danger) 50%, var(--fg-info));
		--ansi-cyan: color-mix(in oklch, var(--fg-info) 55%, var(--fg-success));
		--ansi-0: var(--fg-muted);
		--ansi-1: var(--ansi-red);
		--ansi-2: var(--ansi-green);
		--ansi-3: var(--ansi-yellow);
		--ansi-4: var(--ansi-blue);
		--ansi-5: var(--ansi-magenta);
		--ansi-6: var(--ansi-cyan);
		--ansi-7: var(--fg-default);
		--ansi-8: var(--fg-muted);
		--ansi-9: var(--ansi-red);
		--ansi-10: var(--ansi-green);
		--ansi-11: var(--ansi-yellow);
		--ansi-12: var(--ansi-blue);
		--ansi-13: var(--ansi-magenta);
		--ansi-14: var(--ansi-cyan);
		--ansi-15: var(--fg-default);

		background: var(--surface-code);
		color: var(--fg-default);
		scrollbar-gutter: stable;
	}

	pre {
		margin: 0;
		font: inherit;
	}
</style>
