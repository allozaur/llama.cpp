<script lang="ts">
	import { ICON_CLASS_DEFAULT } from '#lib/constants/index.ts';
	import type { Component, Snippet } from 'svelte';

	interface Props {
		icon: Component<{ class?: string }>;
		message: Snippet;
		/** What the decision is about, shown in full between the question and the actions. */
		detail?: Snippet;
		actions: Snippet;
	}

	let { actions, detail, icon: IconComponent, message }: Props = $props();
</script>

<div class="my-2 rounded-lg border border-(--action-card-border) bg-card p-3">
	<div class="mb-3 flex items-start gap-2 text-body-sm">
		<!-- on the first line of the message, however long it runs -->
		<IconComponent class="{ICON_CLASS_DEFAULT} mt-0.5 shrink-0 text-muted-foreground" />

		<div class="min-w-0 flex-1">
			{@render message()}
		</div>
	</div>

	{#if detail}
		<div class="min-w-0">
			{@render detail()}
		</div>
	{/if}

	<div class="flex flex-wrap items-center gap-2">
		{@render actions()}
	</div>
</div>
