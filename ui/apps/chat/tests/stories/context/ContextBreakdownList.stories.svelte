<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { ContextBreakdownList } from '#lib/components/app/index.ts';
	import { CONTEXT_DEFERRED_SWATCH, CONTEXT_SEGMENT_COLORS } from '#lib/constants/index.ts';
	import { ContextSegment } from '#lib/enums/index.ts';

	// rows of the context breakdown: swatch, label (with a hint, dotted), count and share
	const { Story } = defineMeta({
		component: ContextBreakdownList,
		parameters: {
			layout: 'centered'
		},
		title: 'Llama Chat/Context/ContextBreakdownList'
	});

	const ROWS = [
		{
			colorClass: CONTEXT_SEGMENT_COLORS[ContextSegment.MESSAGES],
			hint: "The rest of llama-server's count once the system prompt and tools are taken out.",
			key: 'messages',
			label: 'Messages',
			share: '10.4%',
			value: '104.2K'
		},
		{
			colorClass: CONTEXT_SEGMENT_COLORS[ContextSegment.SYSTEM_TOOLS],
			hint: 'Estimated from the characters sent, at about 4 a token.',
			key: 'system-tools',
			label: 'System tools',
			share: '1.8%',
			value: '17.6K'
		},
		{
			colorClass: CONTEXT_SEGMENT_COLORS[ContextSegment.MCP_TOOLS],
			hint: 'Estimated from the characters sent, at about 4 a token.',
			key: 'mcp-tools',
			label: 'MCP tools',
			share: '0.7%',
			value: '6.9K'
		},
		{
			colorClass: CONTEXT_SEGMENT_COLORS[ContextSegment.SYSTEM_PROMPT],
			key: 'system-prompt',
			label: 'System prompt',
			share: '<0.1%',
			value: '360'
		},
		{
			colorClass: CONTEXT_SEGMENT_COLORS[ContextSegment.FREE],
			key: 'free',
			label: 'Free space',
			share: '87%',
			value: '870.4K'
		},
		{
			colorClass: CONTEXT_DEFERRED_SWATCH,
			hint: 'Listed by name in the tool_search tool, loaded when the model asks for one.',
			key: 'mcp-deferred',
			label: 'MCP tools (deferred)',
			value: '4.2K'
		}
	];
</script>

<Story asChild name="Default">
	<ContextBreakdownList class="w-72" rows={ROWS} />
</Story>
