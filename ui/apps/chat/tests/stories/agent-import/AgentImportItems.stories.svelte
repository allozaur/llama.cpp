<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import AgentImportItems from '#lib/components/app/agent-import/AgentImportItems.svelte';
	import { AgentImportSource, AgentImportStatus } from '#lib/enums/agent-import.enums.ts';
	import type { AgentImportItemRow } from '#lib/types/agent-import.d.ts';

	const ROW: AgentImportItemRow = {
		checked: true,
		count: 42,
		processed: 0,
		source: AgentImportSource.CLAUDE_CODE,
		status: AgentImportStatus.IDLE
	};

	// second screen of the import: what to import, then progress and result per row
	const { Story } = defineMeta({
		args: {
			items: [ROW],
			onBack: () => {},
			onDone: () => {},
			onImport: () => {},
			onSkip: () => {},
			onToggle: () => {}
		},
		component: AgentImportItems,
		parameters: {
			layout: 'padded'
		},
		title: 'Llama Chat/Agent Import/AgentImportItems'
	});

	const DESKTOP = { viewport: { isRotated: false, value: 'desktop' } };
	const MOBILE = { viewport: { isRotated: false, value: 'mobile2' } };
	const RUNNING = [{ ...ROW, processed: 17, status: AgentImportStatus.RUNNING }];
	const DONE = [
		{
			...ROW,
			processed: 42,
			result: { failed: 0, imported: 39, skipped: 3 },
			status: AgentImportStatus.DONE
		}
	];
</script>

<Story globals={DESKTOP} name="Desktop" />

<Story globals={MOBILE} name="Mobile" />

<Story args={{ items: [{ ...ROW, checked: false }] }} globals={DESKTOP} name="Nothing Checked" />

<Story args={{ items: RUNNING }} globals={DESKTOP} name="Importing" />

<Story args={{ items: RUNNING }} globals={MOBILE} name="Importing Mobile" />

<Story args={{ items: DONE }} globals={DESKTOP} name="Done" />

<Story args={{ items: DONE }} globals={MOBILE} name="Done Mobile" />
