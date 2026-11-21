<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { ContextUsageBar } from '#lib/components/app/index.ts';
	import { CONTEXT_SEGMENT_COLORS } from '#lib/constants/index.ts';
	import { ContextSegment } from '#lib/enums/index.ts';
	import StateGallery from '$llama-ui-stories/helpers/StateGallery.svelte';
	import StateGalleryItem from '$llama-ui-stories/helpers/StateGalleryItem.svelte';

	// the thin bar of the context breakdown: one coloured segment per part, the track free
	const { Story } = defineMeta({
		component: ContextUsageBar,
		parameters: {
			layout: 'centered'
		},
		title: 'Llama Chat/Context/ContextUsageBar'
	});

	function segments(messages: number, tools: number, mcp: number, system: number) {
		return [
			{ key: 'messages', segment: ContextSegment.MESSAGES, value: messages },
			{ key: 'tools', segment: ContextSegment.SYSTEM_TOOLS, value: tools },
			{ key: 'mcp', segment: ContextSegment.MCP_TOOLS, value: mcp },
			{ key: 'system', segment: ContextSegment.SYSTEM_PROMPT, value: system }
		].map(({ key, segment, value }) => ({
			colorClass: CONTEXT_SEGMENT_COLORS[segment],
			key,
			label: key,
			value
		}));
	}

	const STATES = [
		{ label: 'Light use', segments: segments(90_000, 20_000, 15_000, 4_600) },
		{ label: 'Nearly full', segments: segments(880_000, 20_000, 60_000, 4_600) },
		{ label: 'Slivers', segments: segments(400, 2_000, 1_000, 200) },
		{ label: 'Empty', segments: [] }
	];
</script>

<Story asChild name="Default">
	<StateGallery columns={1} minItemWidth="18rem">
		{#each STATES as state (state.label)}
			<StateGalleryItem label={state.label}>
				<ContextUsageBar class="w-72" segments={state.segments} total={1_000_000} />
			</StateGalleryItem>
		{/each}
	</StateGallery>
</Story>
