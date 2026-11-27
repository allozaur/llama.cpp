<script lang="ts">
	import { Card } from '@ggml-org/llama-ui/ui/card';
	import { TruncatedText } from '#lib/components/app/misc/index.ts';
	import { PROMPT_ICON } from '#lib/constants/index.ts';
	import type { Snippet } from 'svelte';

	interface Props {
		class?: string;
		/** The prompt's name, from the library or as kept with the message. */
		name: string;
		content: string;
		/** The smaller card of an attachment, in place of a message's. */
		compact?: boolean;
		/** Shown at the end of the header, e.g. a link to sync the prompt. */
		status?: Snippet;
	}

	let { class: className = '', compact = false, content, name, status }: Props = $props();
</script>

<!-- a prompt of the library, laid out like an MCP prompt: its name above, its text in a card -->
<div class="flex flex-col gap-2 {className}">
	<div class="flex items-center justify-between gap-2">
		<div class="inline-flex min-w-0 items-center gap-1.25 text-caption text-muted-foreground">
			<PROMPT_ICON class="size-3.5 shrink-0" />

			<TruncatedText text={name} />
		</div>

		{@render status?.()}
	</div>

	{#if content.trim()}
		<Card
			class="relative overflow-hidden rounded-2xl border border-border/60 bg-muted/50 py-0 text-foreground dark:bg-muted/40"
		>
			<div
				class="overflow-y-auto {compact
					? 'max-h-24 px-3 py-2'
					: 'max-h-(--max-message-height) px-3.75 py-2.5'}"
				style="overflow-wrap: anywhere; word-break: break-word;"
			>
				<span class="{compact ? 'text-caption' : 'text-md'} whitespace-pre-wrap">{content}</span>
			</div>
		</Card>
	{/if}
</div>
