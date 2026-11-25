<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import AgentImportSources from '#lib/components/app/agent-import/AgentImportSources.svelte';
	import { AgentImportSource } from '#lib/enums/agent-import.enums.ts';

	// first screen of the import: the sources found in the picked files
	const { Story } = defineMeta({
		args: {
			onAddFiles: () => {},
			onContinue: () => {},
			onSkip: () => {},
			onToggle: () => {},
			sources: [{ count: 42, enabled: true, source: AgentImportSource.CLAUDE_CODE }]
		},
		component: AgentImportSources,
		parameters: {
			layout: 'padded'
		},
		title: 'Llama Chat/Agent Import/AgentImportSources'
	});

	const DESKTOP = { viewport: { isRotated: false, value: 'desktop' } };
	const MOBILE = { viewport: { isRotated: false, value: 'mobile2' } };
</script>

<Story globals={DESKTOP} name="Desktop" />

<Story globals={MOBILE} name="Mobile" />

<!-- nothing picked yet -->
<Story args={{ sources: [] }} globals={DESKTOP} name="Nothing Picked" />

<!-- the picked files are being sorted -->
<Story args={{ isReading: true, sources: [] }} globals={DESKTOP} name="Reading" />

<Story
	args={{ sources: [{ count: 42, enabled: false, source: AgentImportSource.CLAUDE_CODE }] }}
	globals={DESKTOP}
	name="Source Off"
/>
