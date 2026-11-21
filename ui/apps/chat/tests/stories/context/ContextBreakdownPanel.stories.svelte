<script lang="ts" module>
	import { contextBreakdown } from './fixtures';
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { ContextBreakdownPanel } from '#lib/components/app/index.ts';
	import StateGallery from '$llama-ui-stories/helpers/StateGallery.svelte';
	import StateGalleryItem from '$llama-ui-stories/helpers/StateGalleryItem.svelte';

	// a conversation's context breakdown, as the gauge's panel (rows) and the Context card (groups) show it
	const { Story } = defineMeta({
		component: ContextBreakdownPanel,
		parameters: {
			layout: 'centered'
		},
		title: 'Llama Chat/Context/ContextBreakdownPanel'
	});

	const STATES = [
		{ breakdown: contextBreakdown(), groups: false, label: 'Rows (gauge panel)' },
		{ breakdown: contextBreakdown(), groups: true, label: 'With groups (side card)' },
		{
			breakdown: contextBreakdown({ deferred: false, total: 32_768, used: 29_000 }),
			groups: false,
			label: 'Nearly full, all tools up front'
		},
		{
			breakdown: contextBreakdown({ total: null, used: null }),
			groups: false,
			label: 'Before the first reply, window unknown'
		}
	];
</script>

<Story asChild name="Default">
	<StateGallery columns={2} minItemWidth="18rem">
		{#each STATES as state (state.label)}
			<StateGalleryItem label={state.label}>
				<ContextBreakdownPanel breakdown={state.breakdown} class="w-72" groups={state.groups} />
			</StateGalleryItem>
		{/each}
	</StateGallery>
</Story>
