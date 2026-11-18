<script lang="ts">
	import type { BrandSuggestion } from '#lib/brand/index.ts';

	interface Props {
		/** Clicked: the prompt goes in the composer, not sent */
		onSelect: (prompt: string) => void;
		suggestions: BrandSuggestion[];
	}

	let { onSelect, suggestions }: Props = $props();

	// a phone shows the first few: the greeting sits above the middle of its screen
	const MOBILE_LIMIT = 4;
</script>

{#if suggestions.length}
	<ul class="mt-6 grid grid-cols-2 gap-2 text-left md:mt-8 md:grid-cols-3 md:gap-3">
		{#each suggestions as suggestion, index (suggestion.title)}
			<li class={[index >= MOBILE_LIMIT && 'max-md:hidden']}>
				<button
					class="flex h-full w-full flex-col gap-1 rounded-lg border border-border bg-card px-3 py-2.5 text-left transition-colors hover:bg-accent focus-visible:bg-accent"
					onclick={() => onSelect(suggestion.prompt)}
					type="button"
				>
					<span class="text-sm font-medium">{suggestion.title}</span>

					<span class="line-clamp-2 text-xs text-muted-foreground max-md:hidden">
						{suggestion.prompt}
					</span>
				</button>
			</li>
		{/each}
	</ul>
{/if}
