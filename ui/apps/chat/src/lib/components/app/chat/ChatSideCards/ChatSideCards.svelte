<script lang="ts">
	// The chat screen's side cards: a third column beside the messages on wide
	// screens, and a corner of floating cards over the messages on narrow ones,
	// where a column would not fit. Each card shows only while it has something
	// to show; add a new card as one more block in the column.

	import BackgroundTasksCard from './BackgroundTasksCard.svelte';
	import { RouterService } from '#lib/services/router.service.ts';
	import {
		backgroundTasksStore,
		conversationsStore,
		toolsStore,
		uiStore
	} from '#lib/stores/index.ts';
	import { untrack } from 'svelte';
	import { fade, slide } from 'svelte/transition';

	interface Props {
		/** A column of the chat screen's layout, instead of cards floating over it. */
		docked?: boolean;
	}

	let { docked = false }: Props = $props();

	// floating cards start folded, so they do not cover the messages
	let tasksOpen = $state(untrack(() => docked));
	let now = $state(Date.now());

	const showTasks = $derived(backgroundTasksStore.tasks.length > 0);

	$effect(() => {
		if (backgroundTasksStore.available) backgroundTasksStore.connect();
	});

	// a task opened from elsewhere (its tool call) unfolds the card
	$effect(() => {
		if (backgroundTasksStore.openTask) tasksOpen = true;
	});

	$effect(() => {
		if (backgroundTasksStore.runningCount === 0) return;

		const timer = setInterval(() => (now = Date.now()), 1000);

		return () => clearInterval(timer);
	});
</script>

{#snippet cards(cardClass: string)}
	<BackgroundTasksCard
		bind:open={tasksOpen}
		activeConversationId={conversationsStore.activeConversation?.id ?? null}
		class={cardClass}
		conversationHref={(id) => RouterService.chat(id)}
		{docked}
		home={toolsStore.serverHome}
		isStopping={(key) => backgroundTasksStore.isStopping(key)}
		{now}
		onClearFinished={() => backgroundTasksStore.clearFinished()}
		onClose={() => backgroundTasksStore.close()}
		onOpen={(key) => backgroundTasksStore.open(key)}
		onStop={(key) => void backgroundTasksStore.stop(key)}
		openTask={backgroundTasksStore.openTask}
		tasks={backgroundTasksStore.tasks}
	/>
{/snippet}

{#if docked}
	{#if showTasks}
		<!-- slides in from the right, narrowing the messages' column as it comes -->
		<aside
			transition:slide={{ axis: 'x', duration: 200 }}
			aria-label="Side cards"
			class="chat-side-cards sticky top-(--chat-tabs-offset,0px) h-[calc(100dvh-var(--chat-tabs-offset,0px))] w-(--chat-side-cards-width) shrink-0 self-start overflow-hidden [--chat-side-cards-width:24rem] xl:[--chat-side-cards-width:28rem]"
		>
			<div class="flex h-full w-(--chat-side-cards-width) flex-col gap-3 overflow-y-auto py-4 pr-4">
				{@render cards('w-full')}
			</div>
		</aside>
	{/if}
{:else if showTasks && !uiStore.isComposerExpanded}
	<aside
		transition:fade={{ duration: 150 }}
		aria-label="Side cards"
		class="chat-side-cards pointer-events-none fixed top-[calc(var(--chat-tabs-offset,0px)+var(--corner-control-top)+3.25rem)] right-4 z-20 flex max-h-[calc(100dvh-8rem)] flex-col items-end gap-3 md:top-[calc(var(--chat-tabs-offset,0px)+1rem)]"
	>
		{@render cards('pointer-events-auto')}
	</aside>
{/if}
