<script lang="ts">
	// The chat screen's invisible sidebar: a column of floating cards on the
	// right, with no panel of its own. Each card shows only while it has
	// something to show; add a new card as one more block in the column.

	import BackgroundTasksCard from './BackgroundTasksCard.svelte';
	import { CHAT_SIDE_CARDS_WIDE_MIN_PX } from '#lib/constants/index.ts';
	import { RouterService } from '#lib/services/router.service.ts';
	import {
		backgroundTasksStore,
		conversationsStore,
		toolsStore,
		uiStore
	} from '#lib/stores/index.ts';
	import { MediaQuery } from 'svelte/reactivity';
	import { fade } from 'svelte/transition';

	const wide = new MediaQuery(`min-width: ${CHAT_SIDE_CARDS_WIDE_MIN_PX}px`);

	// folded on narrower screens, where an open card would cover the messages
	let tasksOpen = $state(wide.current);
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

{#if showTasks && !uiStore.isComposerExpanded}
	<aside
		transition:fade={{ duration: 150 }}
		class="chat-side-cards pointer-events-none fixed top-[calc(var(--chat-tabs-offset,0px)+var(--corner-control-top)+3.25rem)] right-4 z-20 flex max-h-[calc(100dvh-8rem)] flex-col items-end gap-3 md:top-[calc(var(--chat-tabs-offset,0px)+1rem)]"
	>
		<BackgroundTasksCard
			bind:open={tasksOpen}
			activeConversationId={conversationsStore.activeConversation?.id ?? null}
			class="pointer-events-auto"
			conversationHref={(id) => RouterService.chat(id)}
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
	</aside>
{/if}
