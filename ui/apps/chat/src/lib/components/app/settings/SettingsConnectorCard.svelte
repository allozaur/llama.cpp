<script lang="ts">
	import { Badge } from '@ggml-org/llama-ui/ui/badge';
	import * as Card from '@ggml-org/llama-ui/ui/card';
	import type { Snippet } from 'svelte';

	interface Props {
		name: string;
		/** What the connector adds to the app, in one sentence. */
		description: string;
		/** Whether its account or service is set up. */
		isConnected: boolean;
		logo: Snippet;
		/** The connector's own setup, e.g. its account and what the sign-in covers. */
		children: Snippet;
	}

	let { children, description, isConnected, logo, name }: Props = $props();
</script>

<Card.Root class="!gap-4 bg-muted/30 p-4">
	<div class="flex items-start gap-3">
		<span class="flex size-9 shrink-0 items-center justify-center rounded-md bg-background">
			{@render logo()}
		</span>

		<div class="flex min-w-0 flex-1 flex-col gap-1">
			<div class="flex flex-wrap items-center gap-2">
				<h4 class="leading-6 font-medium">{name}</h4>

				<Badge class="h-5 gap-1.5 px-1.5 text-caption-sm" variant="outline">
					<span
						class="size-1.5 rounded-full {isConnected ? 'bg-green-500' : 'bg-muted-foreground/50'}"
					></span>
					{isConnected ? 'Connected' : 'Not connected'}
				</Badge>
			</div>

			<p class="text-body-sm text-muted-foreground">{description}</p>
		</div>
	</div>

	<div class="border-t border-border/40 pt-4">
		{@render children()}
	</div>
</Card.Root>
