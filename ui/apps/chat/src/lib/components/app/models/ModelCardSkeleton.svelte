<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Skeleton } from '$lib/components/ui/skeleton';

	interface Props {
		class?: string;
		/** Leave room for a description, the way a Hub card carries one. */
		description?: boolean;
	}

	let { class: className = '', description = false }: Props = $props();
</script>

<!-- Static skeleton of ModelCard: avatar, name over its subline, capability icons, footer facts. -->
<Card.Root class={['gap-3! bg-muted/30 p-4', className]}>
	<div class="flex items-center gap-3">
		<Skeleton class="size-9 shrink-0 rounded-md" />

		<div class="min-w-0 flex-1 space-y-1.5">
			<Skeleton class="h-4 w-36" />

			<Skeleton class="h-3 w-20" />
		</div>

		<Skeleton class="h-3 w-12 shrink-0 self-start" />
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
