<script lang="ts">
	// The chat screen's side cards: a third column beside the messages on wide
	// screens, and a corner of floating cards over the messages on narrow ones,
	// where a column would not fit. Each card shows only while it has something
	// to show for the conversation on screen, so the new-chat screen has none;
	// add a new card as one more block in the column.

	import BackgroundTasksCard from './BackgroundTasksCard.svelte';
	import { BackgroundTaskStatus } from '#lib/enums/index.ts';
	import { backgroundTasksStore, toolsStore, uiStore } from '#lib/stores/index.ts';
	import { page } from '$app/state';
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

	const conversationId = $derived(page.params.id ?? null);
	// only the tasks this conversation started
	const tasks = $derived(conversationId ? backgroundTasksStore.tasksOf(conversationId) : []);
	const openTask = $derived.by(() => {
		const task = backgroundTasksStore.openTask;

		return task && task.conversationId === conversationId ? task : null;
	});
	const showTasks = $derived(tasks.length > 0);

	$effect(() => {
		if (backgroundTasksStore.available) backgroundTasksStore.connect();
	});

	// a task opened from elsewhere (its tool call) unfolds the card
	$effect(() => {
		if (openTask) tasksOpen = true;
	});

	$effect(() => {
		if (!tasks.some((t) => t.status === BackgroundTaskStatus.RUNNING)) return;

		const timer = setInterval(() => (now = Date.now()), 1000);

		return () => clearInterval(timer);
	});
</script>

{#snippet cards(cardClass: string)}
	<BackgroundTasksCard
		bind:open={tasksOpen}
		class={cardClass}
		{docked}
		home={toolsStore.serverHome}
		isStopping={(key) => backgroundTasksStore.isStopping(key)}
		{now}
		onClearFinished={() => conversationId && backgroundTasksStore.clearFinished(conversationId)}
		onClose={() => backgroundTasksStore.close()}
		onOpen={(key) => backgroundTasksStore.open(key)}
		onStop={(key) => void backgroundTasksStore.stop(key)}
		{openTask}
		{tasks}
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
