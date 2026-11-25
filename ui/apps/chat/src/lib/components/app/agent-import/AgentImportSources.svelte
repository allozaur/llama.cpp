<script lang="ts">
	import { Button } from '@ggml-org/llama-ui/ui/button';
	import { Label } from '@ggml-org/llama-ui/ui/label';
	import { Switch } from '@ggml-org/llama-ui/ui/switch';
	import { FolderOpen, LoaderCircle } from '@lucide/svelte';
	import {
		AGENT_IMPORT_SOURCE_ORDER,
		AGENT_IMPORT_SOURCES
	} from '#lib/constants/agent-import.constants.ts';
	import type { AgentImportSource } from '#lib/enums/agent-import.enums.ts';
	import { HtmlInputType } from '#lib/enums/index.ts';
	import type { AgentImportSourceRow } from '#lib/types/agent-import.d.ts';
	import {
		agentImportCountText,
		type AgentImportFile,
		canPickFolder as browserCanPickFolder,
		filesFromDrop,
		filesFromInput
	} from '#lib/utils/agent-import-files.ts';

	let {
		embedded = false,
		isReading = false,
		onAddFiles,
		onContinue,
		onSkip,
		onToggle,
		sources
	}: {
		/** Inside another flow that has its own heading and buttons. */
		embedded?: boolean;
		/** Picked files are being sorted by source. */
		isReading?: boolean;
		onAddFiles: (files: AgentImportFile[]) => void;
		onContinue: () => void;
		onSkip?: () => void;
		onToggle: (source: AgentImportSource, enabled: boolean) => void;
		/** The sources found in the picked files. */
		sources: AgentImportSourceRow[];
	} = $props();

	let isDragging = $state(false);
	let canContinue = $derived(sources.some((row) => row.enabled));

	// iOS and Android cannot pick a folder
	const canPickFolder = browserCanPickFolder();

	function pick(folder: boolean) {
		const input = document.createElement('input');

		input.type = HtmlInputType.FILE;
		input.multiple = true;
		input.webkitdirectory = folder;
		input.onchange = () => onAddFiles(filesFromInput(input.files));
		input.click();
	}

	async function handleDrop(event: DragEvent) {
		event.preventDefault();
		isDragging = false;
		onAddFiles(await filesFromDrop(event.dataTransfer));
	}
</script>

<div class="flex flex-col gap-6">
	{#if !embedded}
		<div class="flex flex-col gap-2">
			<h2 class="text-heading">Import chats from other AI apps</h2>

			<p class="text-body-sm text-pretty text-muted-foreground">
				Bring your chat sessions into Llama Chat. The files are read in this browser and stay on
				this device.
			</p>
		</div>
	{/if}

	{#if sources.length > 0}
		<ul class="space-y-2">
			{#each sources as row (row.source)}
				{@const id = `agent-import-source-${row.source}`}

				<li class="flex items-center gap-4 rounded-lg border border-border/60 p-4">
					<div class="min-w-0 flex-1">
						<Label class="font-medium" for={id}>{AGENT_IMPORT_SOURCES[row.source].name}</Label>

						<p class="text-caption text-muted-foreground">
							{agentImportCountText(row.count)} found
						</p>
					</div>

					<Switch
						checked={row.enabled}
						{id}
						onCheckedChange={(checked) => onToggle(row.source, checked)}
					/>
				</li>
			{/each}
		</ul>
	{/if}

	<div
		class={[
			'flex flex-col items-start gap-3 rounded-lg border border-dashed p-4 transition-colors',
			isDragging ? 'border-primary bg-muted/50' : 'border-border'
		]}
		ondragleave={() => (isDragging = false)}
		ondragover={(event) => {
			event.preventDefault();
			isDragging = true;
		}}
		ondrop={handleDrop}
		role="group"
	>
		<p class="text-body-sm">
			{sources.length > 0 ? 'Add another folder or file:' : 'Choose where your sessions are:'}
		</p>

		<ul class="space-y-1 text-caption text-muted-foreground">
			{#each AGENT_IMPORT_SOURCE_ORDER as source (source)}
				<li>
					{AGENT_IMPORT_SOURCES[source].name}:
					<code class="font-mono">{AGENT_IMPORT_SOURCES[source].location}</code>
				</li>
			{/each}
		</ul>

		<div class="flex flex-wrap items-center gap-2">
			{#if canPickFolder}
				<Button disabled={isReading} onclick={() => pick(true)} size="sm" variant="outline">
					<FolderOpen class="mr-2 size-icon-sm" />

					Choose folder
				</Button>
			{/if}

			<Button disabled={isReading} onclick={() => pick(false)} size="sm" variant="outline">
				Choose files
			</Button>

			{#if isReading}
				<LoaderCircle class="size-icon-sm animate-spin text-muted-foreground" />

				<span class="text-caption text-muted-foreground">Looking for sessions...</span>
			{/if}
		</div>

		{#if canPickFolder}
			<p class="text-caption text-muted-foreground">
				You can also drop a folder here. In the macOS file dialog, press Cmd+Shift+G to type a path
				that starts with a dot.
			</p>
		{/if}
	</div>

	<div class="flex items-center justify-between gap-2">
		{#if onSkip}
			<Button onclick={onSkip} variant="ghost">Skip</Button>
		{:else}
			<span></span>
		{/if}

		<Button disabled={!canContinue} onclick={onContinue} variant={embedded ? 'outline' : 'default'}>
			{embedded ? 'Select chats' : 'Continue'}
		</Button>
	</div>
</div>
