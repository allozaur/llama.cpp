<script lang="ts">
	import { ScanText } from '@lucide/svelte';
	import { TruncatedText } from '$lib/components/app/misc';
	import { Card } from '$lib/components/ui/card';
	import type { Snippet } from 'svelte';

	interface Props {
		class?: string;
		/** The prompt's name, from the library or as stored on the message. */
		name: string;
		content: string;
		/** Shown at the end of the header, e.g. a link to sync the prompt. */
		status?: Snippet;
	}

	let { class: className = '', content, name, status }: Props = $props();
</script>

<!-- the MCP prompt card's layout for a library prompt: its name above, its text in a card -->
<div class="flex flex-col gap-2 {className}">
	<div class="flex items-center justify-between gap-2">
		<div class="inline-flex min-w-0 items-center gap-1.25 text-xs text-muted-foreground">
			<ScanText class="size-3.5 shrink-0" />

			<TruncatedText text={name} />
		</div>

		{@render status?.()}
	</div>

	{#if content.trim()}
		<Card
			class="relative overflow-hidden rounded-[1.125rem] border border-border/60 bg-muted/50 py-0 text-foreground dark:bg-muted/40"
		>
			<div
				class="overflow-y-auto px-3.75 py-2.5"
				style="max-height: var(--max-message-height); overflow-wrap: anywhere; word-break: break-word;"
			>
				<span class="text-md whitespace-pre-wrap">{content}</span>
			</div>
		</Card>
	{/if}
</div>
