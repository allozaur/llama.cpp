<script lang="ts" module>
	import { contextBreakdown } from '../context/fixtures';
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import ContextCard from '#lib/components/app/chat/ChatSideCards/ContextCard.svelte';

	const { Story } = defineMeta({
		component: ContextCard,
		parameters: {
			layout: 'centered'
		},
		title: 'Llama Chat/Chat/ContextCard'
	});
</script>

<Story asChild name="Default">
	<ContextCard breakdown={contextBreakdown()} class="w-96" />
</Story>

<Story asChild name="Nearly full">
	<ContextCard
		breakdown={contextBreakdown({ deferred: false, total: 32_768, used: 31_500 })}
		class="w-96"
		levelClass="text-fg-danger"
	/>
</Story>

<Story asChild name="Folded">
	<ContextCard breakdown={contextBreakdown()} class="w-96" open={false} />
</Story>
