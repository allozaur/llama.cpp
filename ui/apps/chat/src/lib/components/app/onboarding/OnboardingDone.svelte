<script lang="ts">
	import { Button } from '@ggml-org/llama-ui/ui/button';
	import type { OnboardingTask } from '#lib/constants/index.ts';

	interface Props {
		/** First tasks to offer; none when no model can answer. */
		tasks?: OnboardingTask[];
		onPrompt?: (prompt: string) => void;
	}

	let { onPrompt, tasks = [] }: Props = $props();
</script>

{#if tasks.length > 0}
	<ul class="grid grid-cols-2 gap-3 md:grid-cols-4">
		{#each tasks as task (task.id)}
			<li class="contents">
				<Button
					class="h-auto flex-col items-start justify-start gap-3 p-4 text-left whitespace-normal"
					onclick={() => onPrompt?.(task.prompt)}
					variant="outline"
				>
					<task.icon class="size-icon-lg text-muted-foreground" />

					{task.label}
				</Button>
			</li>
		{/each}
	</ul>
{:else}
	<p class="text-body-sm text-muted-foreground">
		No model is ready to answer yet. Once the server has one, write your first message.
	</p>
{/if}

<p class="text-caption text-muted-foreground">
	You can open this guide again from Settings, under Data.
</p>
