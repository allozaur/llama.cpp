<script lang="ts">
	import { Button } from '@ggml-org/llama-ui/ui/button';
	import { ArrowRight } from '@lucide/svelte';
	import { ONBOARDING_EXAMPLE_PROMPTS } from '#lib/constants/index.ts';

	interface Props {
		/** Whether a model can answer; without one the prompts are left out. */
		canChat?: boolean;
		onPrompt?: (prompt: string) => void;
	}

	let { canChat = false, onPrompt }: Props = $props();
</script>

{#if canChat}
	<div class="space-y-2">
		<p class="text-body-sm text-muted-foreground">Start with one of these, or write your own.</p>

		<ul class="space-y-2">
			{#each ONBOARDING_EXAMPLE_PROMPTS as prompt (prompt)}
				<li>
					<Button
						class="h-auto w-full justify-between gap-3 py-3 text-left whitespace-normal"
						onclick={() => onPrompt?.(prompt)}
						variant="outline"
					>
						{prompt}

						<ArrowRight class="size-icon-md shrink-0 text-muted-foreground" />
					</Button>
				</li>
			{/each}
		</ul>
	</div>
{:else}
	<p class="text-body-sm text-muted-foreground">
		No model is ready to answer yet. Once the server has one, write your first message.
	</p>
{/if}
