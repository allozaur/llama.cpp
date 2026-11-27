<!--
	A shell command to copy: one line of Llama Mono on the code surface, with a button that copies it. The programs
	take cinder, the brand's accent, and the flags and pipes go muted, so what a reader would change (a package, a URL,
	a model) stays in the code colour. It wraps at spaces rather than scrolling, since a clipped command hides its end.
	Copying swaps the icon for a check for a moment; `onCopy` is for an app that wants to do more.
-->
<script lang="ts">
	import { Check, Copy } from '@lucide/svelte';
	import ActionIcon from '../actions/ActionIcon.svelte';
	import * as Tooltip from '../../ui/tooltip';
	import { cn } from '../../ui/utils';
	import { COMMAND_COPIED_FEEDBACK_MS } from '../../../constants';
	import { CommandWordKind } from '../../../enums';
	import { splitCommand } from '../../../utils';

	interface Props {
		command: string;
		class?: string;
		/** Tighter, for a command that is an aside in small print. */
		compact?: boolean;
		/** A `$` before the command, as in a terminal. It is not copied. */
		prompt?: boolean;
		onCopy?: (command: string) => void;
	}

	let { class: className = '', command, compact = false, onCopy, prompt = false }: Props = $props();

	let copied = $state(false);
	let resetTimer: ReturnType<typeof setTimeout> | undefined;

	const PROMPT = '$ ';

	const WORD_CLASS: Partial<Record<CommandWordKind, string>> = {
		[CommandWordKind.FLAG]: 'text-muted-foreground',
		[CommandWordKind.PIPE]: 'text-muted-foreground',
		[CommandWordKind.PROGRAM]: 'text-(--art-cinder)'
	};

	async function copy() {
		await navigator.clipboard.writeText(command);
		onCopy?.(command);
		copied = true;
		clearTimeout(resetTimer);
		resetTimer = setTimeout(() => (copied = false), COMMAND_COPIED_FEEDBACK_MS);
	}

	$effect(() => () => clearTimeout(resetTimer));
</script>

<div
	class={cn(
		'flex min-w-0 items-center gap-1.5 rounded-md bg-(--surface-code) font-mono text-body-sm',
		compact ? 'py-0.5 pr-1 pl-2' : 'min-h-10 py-1 pr-2 pl-3',
		className
	)}
>
	<!-- no whitespace between the words, so a selection copies as the command -->
	<code class="min-w-0 flex-1 wrap-break-word whitespace-pre-wrap text-(--fg-code)"
		>{#if prompt}<span aria-hidden="true" class="text-(--art-cinder) select-none">{PROMPT}</span
			>{/if}{#each splitCommand(command) as word, i (i)}<span class={WORD_CLASS[word.kind]}
				>{word.text}</span
			>{/each}</code
	>

	<Tooltip.Provider>
		<ActionIcon
			ariaLabel={copied ? 'Copied command' : 'Copy command'}
			class="shrink-0 text-muted-foreground"
			icon={copied ? Check : Copy}
			iconSize="size-icon-sm"
			onclick={copy}
			tooltip={copied ? 'Copied' : 'Copy'}
		/>
	</Tooltip.Provider>
</div>
