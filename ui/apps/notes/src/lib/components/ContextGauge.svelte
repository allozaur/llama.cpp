<script lang="ts">
	import * as Tooltip from '@ggml-org/llama-ui/ui/tooltip';

	interface Props {
		/** The model's context size, or null while unknown. */
		total: number | null;
		/** Tokens of the note, or null while unknown. */
		used: number | null;
	}

	let { total, used }: Props = $props();

	const RADIUS = 7;
	const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
	const WARNING_SHARE = 0.9;

	let share = $derived(used !== null && total ? Math.min(used / total, 1) : 0);
	let label = $derived.by(() => {
		if (used === null) return 'Context: unknown';

		if (!total) return `Context: ${used} tokens`;

		return `Context: ${used} / ${total} tokens (${Math.round((used / total) * 100)}%)`;
	});
</script>

<Tooltip.Root>
	<Tooltip.Trigger>
		{#snippet child({ props })}
			<span
				{...props}
				aria-label={label}
				class="inline-flex size-8 items-center justify-center"
				data-testid="context-gauge"
				role="img"
			>
				<svg class="size-5 -rotate-90" viewBox="0 0 20 20">
					<circle class="stroke-border" cx="10" cy="10" fill="none" r={RADIUS} stroke-width="2.5" />

					<circle
						class={share >= WARNING_SHARE ? 'stroke-destructive' : 'stroke-foreground'}
						cx="10"
						cy="10"
						fill="none"
						r={RADIUS}
						stroke-dasharray={CIRCUMFERENCE}
						stroke-dashoffset={CIRCUMFERENCE * (1 - share)}
						stroke-width="2.5"
					/>
				</svg>
			</span>
		{/snippet}
	</Tooltip.Trigger>

	<Tooltip.Content>
		<p>{label}</p>
	</Tooltip.Content>
</Tooltip.Root>
