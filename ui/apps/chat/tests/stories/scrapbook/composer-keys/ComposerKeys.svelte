<!--
	The chat form's add key and model selector trigger in each proposal, on the real chat form surface. Only the two
	keys change between rows: their fill and their shadow, set with the design system's tokens.
-->
<script lang="ts">
	import { ChevronDown, Mic, Plus } from '@lucide/svelte';

	interface Variant {
		id: string;
		name: string;
		note: string;
		/** classes for both keys: fill and shadow */
		key: string;
	}

	const variants: Variant[] = [
		{
			id: 'A',
			key: 'bg-background shadow-(--elevation-control)',
			name: 'Before',
			note: 'White fill, the control elevation: three layers reaching 4px down.'
		},
		{
			id: 'B',
			key: 'bg-(--surface-muted) shadow-(--elevation-control)',
			name: 'A shade darker',
			note: 'The muted surface (neutral-100) as the fill, the same shadow.'
		},
		{
			id: 'C',
			key: 'bg-background shadow-(--elevation-key)',
			name: 'Tighter shadow · chosen',
			note: 'White fill; the shadow keeps to 1px under the key, with a faint hairline all round. Now --elevation-key.'
		},
		{
			id: 'D',
			key: 'bg-(--surface-muted) shadow-[0_0_0_0.5px_rgb(0_0_0/0.08),0_1px_1.5px_rgb(0_0_0/0.08)]',
			name: 'Darker, tighter',
			note: 'B and C together: the muted fill and the tight shadow.'
		},
		{
			id: 'E',
			key: 'bg-background shadow-[0_0_0_1px_var(--edge-rest-side),0_1px_1px_rgb(0_0_0/0.04)]',
			name: 'Hairline edge',
			note: 'White fill, an even edge in the rest edge colour, and only a whisper of a drop.'
		},
		{
			id: 'F',
			key: 'bg-(--surface-emphasis) shadow-none',
			name: 'Emphasis fill, no drop',
			note: 'The emphasis surface (neutral-150) as the fill, flat: the shade alone sets the key apart.'
		}
	];
</script>

<div class="flex min-h-screen flex-col gap-8 bg-(--surface-page) px-8 py-10">
	{#each variants as variant (variant.id)}
		<section class="flex max-w-3xl flex-col gap-3">
			<div class="flex items-baseline gap-2">
				<span class="font-mono text-label-sm text-fg-muted">{variant.id}</span>

				<h2 class="text-label">{variant.name}</h2>

				<p class="text-caption text-fg-muted">{variant.note}</p>
			</div>

			<div class="chat-form-surface flex items-center gap-3 rounded-full px-3 py-2.5">
				<span
					class="flex size-8 shrink-0 items-center justify-center rounded-full {variant.key}"
					title="Add"
				>
					<Plus class="size-icon-md" />
				</span>

				<span class="engraved min-w-0 flex-1 truncate text-body">Type a message...</span>

				<span
					class="inline-flex shrink-0 items-center gap-1 rounded-sm px-1.5 py-1 text-xs text-foreground {variant.key}"
				>
					<span class="size-icon-sm rounded-full bg-emerald-600"></span>
					unsloth/Qwen3.8-Flash-Next
					<ChevronDown class="size-icon-xs" />
				</span>

				<Mic class="size-icon-md shrink-0" />
			</div>
		</section>
	{/each}
</div>
