<script lang="ts">
	import AgentImportItems from './AgentImportItems.svelte';
	import AgentImportSources from './AgentImportSources.svelte';
	import {
		AGENT_IMPORT_BATCH_SIZE,
		AGENT_IMPORT_SOURCE_ORDER
	} from '#lib/constants/agent-import.constants.ts';
	import {
		type AgentImportSource,
		AgentImportStatus,
		AgentImportStep
	} from '#lib/enums/agent-import.enums.ts';
	import { conversationsStore, groupsStore } from '#lib/stores/index.ts';
	import type {
		AgentImportItemRow,
		AgentImportResult,
		AgentImportSourceRow
	} from '#lib/types/agent-import.d.ts';
	import type { ExportedConversation } from '#lib/types/index.ts';
	import {
		type AgentImportFile,
		groupAgentImportFiles,
		parseAgentImportFile
	} from '#lib/utils/agent-import-files.ts';
	import { toast } from 'svelte-sonner';

	let {
		class: className,
		onDone,
		onSkip
	}: {
		class?: string;
		/** The import ran and the user closed its result. */
		onDone: () => void;
		/** The user left without importing. */
		onSkip: () => void;
	} = $props();

	let step = $state(AgentImportStep.SOURCES);
	let isReading = $state(false);
	let files = $state.raw<Partial<Record<AgentImportSource, AgentImportFile[]>>>({});
	let disabled = $state<AgentImportSource[]>([]);
	let items = $state<AgentImportItemRow[]>([]);

	let sources = $derived<AgentImportSourceRow[]>(
		AGENT_IMPORT_SOURCE_ORDER.filter((source) => files[source]).map((source) => ({
			count: files[source]!.length,
			enabled: !disabled.includes(source),
			source
		}))
	);

	function fileKey(entry: AgentImportFile): string {
		return `${entry.path}:${entry.file.size}`;
	}

	async function handleAddFiles(picked: AgentImportFile[]) {
		if (picked.length === 0) return;

		isReading = true;

		try {
			const found = await groupAgentImportFiles(picked);

			if (found.size === 0) {
				toast.info('No chat sessions found in these files');

				return;
			}

			const merged = { ...files };

			for (const [source, entries] of found) {
				const known = merged[source] ?? [];
				const keys = new Set(known.map(fileKey));

				// the same folder picked twice adds nothing
				merged[source] = [...known, ...entries.filter((entry) => !keys.has(fileKey(entry)))];
			}

			files = merged;
		} catch (error) {
			console.error('Failed to read the picked files:', error);
			toast.error('Failed to read the picked files');
		} finally {
			isReading = false;
		}
	}

	function handleToggleSource(source: AgentImportSource, enabled: boolean) {
		disabled = enabled ? disabled.filter((entry) => entry !== source) : [...disabled, source];
	}

	function handleContinue() {
		items = sources
			.filter((row) => row.enabled)
			.map((row) => ({
				checked: true,
				count: row.count,
				processed: 0,
				source: row.source,
				status: AgentImportStatus.IDLE
			}));
		step = AgentImportStep.ITEMS;
	}

	function handleToggleItem(source: AgentImportSource, checked: boolean) {
		const row = items.find((entry) => entry.source === source);

		if (row) row.checked = checked;
	}

	/** Writes parsed sessions through the conversation import, a batch at a time. */
	async function writeSessions(sessions: ExportedConversation[], result: AgentImportResult) {
		for (let start = 0; start < sessions.length; start += AGENT_IMPORT_BATCH_SIZE) {
			const batch = sessions.slice(start, start + AGENT_IMPORT_BATCH_SIZE);
			const { imported, skipped } = await conversationsStore.importConversationsData(batch);

			result.imported += imported.length;
			result.skipped += skipped.length;
		}
	}

	async function importRow(row: AgentImportItemRow) {
		const result: AgentImportResult = { failed: 0, imported: 0, skipped: 0 };

		let pending: ExportedConversation[] = [];

		row.status = AgentImportStatus.RUNNING;

		for (const { file } of files[row.source] ?? []) {
			try {
				const sessions = parseAgentImportFile(await file.text(), file.name);

				// a file with nothing to show, such as a session that never got a prompt
				if (sessions.length === 0) result.skipped += 1;

				pending.push(...sessions);

				if (pending.length >= AGENT_IMPORT_BATCH_SIZE) {
					await writeSessions(pending, result);
					pending = [];
				}
			} catch (error) {
				console.error(`Failed to import ${file.name}:`, error);
				result.failed += 1;
			}

			row.processed += 1;
		}

		try {
			await writeSessions(pending, result);
		} catch (error) {
			console.error('Failed to import sessions:', error);
			result.failed += pending.length;
		}

		row.result = result;
		row.status = AgentImportStatus.DONE;
	}

	async function handleImport() {
		for (const row of items) {
			if (row.checked && row.status === AgentImportStatus.IDLE) await importRow(row);
		}

		// an import adds the group of each source
		await groupsStore.reload();
	}
</script>

<div class={className}>
	{#if step === AgentImportStep.SOURCES}
		<AgentImportSources
			{isReading}
			onAddFiles={handleAddFiles}
			onContinue={handleContinue}
			{onSkip}
			onToggle={handleToggleSource}
			{sources}
		/>
	{:else}
		<AgentImportItems
			{items}
			onBack={() => (step = AgentImportStep.SOURCES)}
			{onDone}
			onImport={handleImport}
			{onSkip}
			onToggle={handleToggleItem}
		/>
	{/if}
</div>
