<script lang="ts">
	import type { OnboardingTask } from '#lib/constants/index.ts';

	interface Props {
		/** First tasks to offer; none when no model can answer. */
		tasks?: OnboardingTask[];
		onPrompt?: (prompt: string) => void;
	}

	let { onPrompt, tasks = [] }: Props = $props();
</script>

{#if tasks.length > 0}
	<ul class="grid grid-cols-2 gap-2 md:grid-cols-4">
		{#each tasks as task (task.id)}
			<li class="contents">
				<button
					class="flex cursor-pointer flex-col items-start gap-3 rounded-lg border border-border/60 p-3 text-left text-body-sm transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden"
					onclick={() => onPrompt?.(task.prompt)}
					type="button"
				>
					<task.icon class="size-icon-lg text-muted-foreground" />

					{task.label}
				</button>
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
