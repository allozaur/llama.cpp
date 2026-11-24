<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { ContextBreakdownGroup } from '#lib/components/app/index.ts';
	import { CONTEXT_SEGMENT_COLORS } from '#lib/constants/index.ts';
	import { ContextSegment } from '#lib/enums/index.ts';
	import StateGallery from '$llama-ui-stories/helpers/StateGallery.svelte';
	import StateGalleryItem from '$llama-ui-stories/helpers/StateGalleryItem.svelte';

	// a folding group of the context breakdown: each item with its count
	const { Story } = defineMeta({
		component: ContextBreakdownGroup,
		parameters: {
			layout: 'centered'
		},
		title: 'Llama Chat/Context/ContextBreakdownGroup'
	});

	const ITEMS = [
		{ detail: 'GitHub', key: 'create_issue', label: 'create_issue', value: '412' },
		{ detail: 'GitHub', key: 'search_issues', label: 'search_issues', value: '338' },
		{ detail: 'Linear', key: 'create_project', label: 'create_project', value: '214' },
		{ detail: 'Postgres', key: 'query_database', label: 'query_database', value: '389' }
	];
</script>

<Story asChild name="Default">
	<StateGallery columns={2} minItemWidth="18rem">
		{#each [false, true] as open (open)}
			<StateGalleryItem label={open ? 'Open' : 'Folded'}>
				<ContextBreakdownGroup
					class="w-72"
					colorClass={CONTEXT_SEGMENT_COLORS[ContextSegment.MCP_TOOLS]}
					items={ITEMS}
					{open}
					title="MCP tools"
				/>
			</StateGalleryItem>
		{/each}
	</StateGallery>
</Story>
