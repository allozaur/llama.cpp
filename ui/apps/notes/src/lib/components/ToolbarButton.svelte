<script lang="ts">
	import KeyboardShortcut from './KeyboardShortcut.svelte';
	import { Button, type ButtonVariant } from '@ggml-org/llama-ui/ui/button';
	import * as Tooltip from '@ggml-org/llama-ui/ui/tooltip';
	import type { Snippet } from 'svelte';

	interface Props {
		children: Snippet;
		class?: string;
		disabled?: boolean;
		/** Shown in the tooltip in place of the label, e.g. why the button is disabled. */
		hint?: string;
		label: string;
		onclick: () => void;
		shortcut?: string[];
		variant?: ButtonVariant;
	}

	let {
		children,
		class: className = '',
		disabled = false,
		hint,
		label,
		onclick,
		shortcut,
		variant = 'ghost'
	}: Props = $props();
</script>

<Tooltip.Root>
	<Tooltip.Trigger>
		{#snippet child({ props })}
			<!-- the span takes the hover, so a disabled button still shows its tooltip -->
			<span {...props} class="inline-flex">
				<Button
					aria-label={label}
					class="size-8 rounded-full p-0 max-md:size-9 {className}"
					{disabled}
					{onclick}
					{variant}
				>
					{@render children()}
				</Button>
			</span>
		{/snippet}
	</Tooltip.Trigger>

	<Tooltip.Content>
		<div class="flex items-center gap-2">
			<p>{hint ?? label}</p>

			{#if shortcut && !hint}
				<KeyboardShortcut keys={shortcut} />
			{/if}
		</div>
	</Tooltip.Content>
</Tooltip.Root>
