<script lang="ts">
	import * as Card from '@ggml/llama-ui/ui/card';
	import { Skeleton } from '@ggml/llama-ui/ui/skeleton';

	interface Props {
		class?: string;
		/** Leave room for a description, the way a Hub card carries one. */
		description?: boolean;
	}

	let { class: className = '', description = false }: Props = $props();
</script>

<!-- Static skeleton of ModelCard: avatar and name, capability badges, footer facts. -->
<Card.Root class={['gap-3! bg-muted/30 p-4', className]}>
	<div class="flex items-center gap-3">
		<Skeleton class="h-9 w-9 shrink-0 rounded-full" />

		<div class="min-w-0 flex-1 space-y-1.5">
			<Skeleton class="h-4 w-36" />

			<Skeleton class="h-3.5 w-20" />
		</div>
	</div>

	<div class="flex flex-wrap gap-1.5">
		<Skeleton class="h-5 w-16 rounded-md" />

		<Skeleton class="h-5 w-20 rounded-md" />
	</div>

	{#if description}
		<div class="space-y-1.5">
			<Skeleton class="h-3 w-full" />

			<Skeleton class="h-3 w-3/4" />
		</div>
	{/if}

	<div class="mt-auto flex items-center justify-between">
		<Skeleton class="h-3 w-24" />

		<Skeleton class="h-3 w-16" />
	</div>
</Card.Root>
