<script lang="ts">
	import { Button } from '@ggml-org/llama-ui/ui/button';
	import { Checkbox } from '@ggml-org/llama-ui/ui/checkbox';
	import { Label } from '@ggml-org/llama-ui/ui/label';
	import { Check, LoaderCircle } from '@lucide/svelte';
	import { AGENT_IMPORT_SOURCES } from '#lib/constants/agent-import.constants.ts';
	import { type AgentImportSource, AgentImportStatus } from '#lib/enums/agent-import.enums.ts';
	import type { AgentImportItemRow, AgentImportResult } from '#lib/types/agent-import.d.ts';
	import { agentImportCountText } from '#lib/utils/agent-import-files.ts';

	let {
		embedded = false,
		items,
		onBack,
		onDone,
		onImport,
		onSkip,
		onToggle
	}: {
		/** Inside another flow that has its own heading and buttons. */
		embedded?: boolean;
		/** One row per source: its chat sessions. */
		items: AgentImportItemRow[];
		onBack: () => void;
		onDone?: () => void;
		onImport: () => void;
		onSkip?: () => void;
		onToggle: (source: AgentImportSource, checked: boolean) => void;
	} = $props();

	let isRunning = $derived(items.some((row) => row.status === AgentImportStatus.RUNNING));
	let isDone = $derived(
		items.some((row) => row.status === AgentImportStatus.DONE) &&
			items.every((row) => !row.checked || row.status === AgentImportStatus.DONE)
	);
	let canImport = $derived(items.some((row) => row.checked));

	function resultText(result: AgentImportResult): string {
		const parts = [`${result.imported} imported`];

		if (result.skipped > 0) parts.push(`${result.skipped} skipped`);

		if (result.failed > 0) parts.push(`${result.failed} failed`);

		return parts.join(', ');
	}
</script>

<div class="flex flex-col gap-6">
	{#if !embedded}
		<div class="flex flex-col gap-2">
			<h2 class="text-heading">Select items to import</h2>

			<p class="text-body-sm text-pretty text-muted-foreground">
				Each session becomes a conversation. A session that is already in your library is skipped.
			</p>
		</div>
	{/if}

	<ul class="space-y-2">
		{#each items as row (row.source)}
			{@const id = `agent-import-item-${row.source}`}

			<li class="flex flex-col gap-2 rounded-lg border border-border/60 p-4">
				<div class="flex items-center gap-3">
					<Checkbox
						checked={row.checked}
						disabled={row.status !== AgentImportStatus.IDLE || isRunning}
						{id}
						onCheckedChange={(checked) => onToggle(row.source, checked === true)}
					/>

					<div class="min-w-0 flex-1">
						<Label class="font-medium" for={id}>
							{AGENT_IMPORT_SOURCES[row.source].name} chats
						</Label>
					</div>

					{#if row.status === AgentImportStatus.DONE && row.result}
						<span class="text-caption text-muted-foreground">{resultText(row.result)}</span>

						<Check aria-label="Done" class="size-icon-md shrink-0 text-fg-success" />
					{:else if row.status === AgentImportStatus.RUNNING}
						<span class="text-caption text-muted-foreground tabular-nums">
							{row.processed} / {row.count}
						</span>

						<LoaderCircle class="size-icon-md shrink-0 animate-spin text-muted-foreground" />
					{:else}
						<span class="text-caption text-muted-foreground tabular-nums">
							{agentImportCountText(row.count)}
						</span>
					{/if}
				</div>

				{#if row.status === AgentImportStatus.RUNNING}
					<div
						aria-label="Import progress"
						aria-valuemax={row.count}
						aria-valuemin={0}
						aria-valuenow={row.processed}
						class="h-1 overflow-hidden rounded-full bg-muted"
						role="progressbar"
					>
						<div
							style:width="{row.count ? (row.processed / row.count) * 100 : 0}%"
							class="h-full rounded-full bg-primary transition-[width]"
						></div>
					</div>
				{/if}
			</li>
		{/each}
	</ul>

	<div class="flex items-center justify-between gap-2">
		{#if isDone}
			<span></span>

			{#if onDone}
				<Button onclick={onDone}>Done</Button>
			{/if}
		{:else}
			<div class="flex items-center gap-1">
				<Button disabled={isRunning} onclick={onBack} variant="ghost">Back</Button>

				{#if onSkip}
					<Button disabled={isRunning} onclick={onSkip} variant="ghost">Skip</Button>
				{/if}
			</div>

			<Button disabled={!canImport || isRunning} onclick={onImport}>
				{isRunning ? 'Importing...' : 'Import'}
			</Button>
		{/if}
	</div>
</div>
