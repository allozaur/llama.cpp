<script lang="ts">
	import { Button, buttonVariants } from '@ggml-org/llama-ui/ui/button';
	import * as ButtonGroup from '@ggml-org/llama-ui/ui/button-group';
	import * as DropdownMenu from '@ggml-org/llama-ui/ui/dropdown-menu';
	import { Input } from '@ggml-org/llama-ui/ui/input';
	import { cn } from '@ggml-org/llama-ui/utils';
	import { ChevronDown, ShieldQuestion } from '@lucide/svelte';
	import { ChatMessageActionCard } from '#lib/components/app/index.ts';
	import { TOOL_SERVER_LABELS } from '#lib/constants/index.ts';
	import { ToolPermissionDecision, ToolSource } from '#lib/enums/index.ts';
	import { toolsStore } from '#lib/stores/index.ts';
	import type { PermissionAnswer, PermissionRequest } from '#lib/types/index.ts';

	interface Props {
		request: PermissionRequest;
		onDecision: (decision: ToolPermissionDecision, answer?: PermissionAnswer) => void;
	}

	let { onDecision, request }: Props = $props();

	// the proposed patterns, editable before a choice that remembers them
	// svelte-ignore state_referenced_locally
	let patterns = $state([...request.patterns]);

	const isShell = $derived(request.command !== undefined);
	const folderName = $derived(
		request.cwd
			?.replace(/[\\/]+$/, '')
			.split(/[\\/]/)
			.pop() || request.cwd
	);
	const providerName = $derived.by(() => {
		if (request.serverLabel) return request.serverLabel;

		const source = toolsStore.getToolSource(request.toolName);

		if (source === ToolSource.SERVER) return TOOL_SERVER_LABELS[ToolSource.SERVER];

		if (source === ToolSource.CUSTOM) return TOOL_SERVER_LABELS[ToolSource.CUSTOM];

		return 'MCP Tools';
	});

	function decide(decision: ToolPermissionDecision) {
		onDecision(decision, isShell ? { patterns } : undefined);
	}
</script>

<ChatMessageActionCard icon={ShieldQuestion}>
	{#snippet message()}
		Allow use of <span class="font-semibold">{request.toolName}</span>{#if request.serverLabel}
			&nbsp;from <span class="font-semibold">{request.serverLabel}</span>{/if}?

		{#if isShell && patterns.length > 0}
			<span class="mt-2 flex flex-col gap-1.5">
				<span class="text-caption text-muted-foreground">
					Remembered as {patterns.length > 1 ? 'these patterns' : 'this pattern'} when you allow it for
					this chat or always:
				</span>

				{#each patterns as _, index (index)}
					<Input
						bind:value={patterns[index]}
						aria-label="Command pattern {index + 1}"
						class="h-7 font-mono text-caption"
						spellcheck={false}
					/>
				{/each}
			</span>
		{/if}
	{/snippet}

	{#snippet detail()}
		<!-- the command in full: the trace row may show the model's own description of it -->
		{#if request.command !== undefined}
			<pre
				class="mb-3 max-h-40 overflow-auto rounded-md bg-(--surface-code) px-3 py-2 font-mono text-caption whitespace-pre-wrap break-words">{request.command}</pre>
		{/if}
	{/snippet}

	{#snippet actions()}
		<DropdownMenu.Root>
			<ButtonGroup.Root>
				<Button onclick={() => decide(ToolPermissionDecision.ONCE)} size="sm" variant="outline">
					Allow once
				</Button>

				<ButtonGroup.Separator />

				<DropdownMenu.Trigger
					aria-label="More allow options"
					class={cn(
						buttonVariants({ size: 'sm', variant: 'outline' }),
						'inline-flex cursor-pointer items-center !px-2'
					)}
				>
					<ChevronDown class="size-icon-sm" />
				</DropdownMenu.Trigger>
			</ButtonGroup.Root>

			<DropdownMenu.Content align="start" class="min-w-32">
				<DropdownMenu.Item onclick={() => decide(ToolPermissionDecision.SESSION)}>
					Allow for this chat
				</DropdownMenu.Item>

				{#if request.cwd}
					<DropdownMenu.Item onclick={() => decide(ToolPermissionDecision.ALWAYS_HERE)}>
						Always allow in <span class="font-mono" title={request.cwd}>{folderName}</span>
					</DropdownMenu.Item>
				{/if}

				<DropdownMenu.Item onclick={() => decide(ToolPermissionDecision.ALWAYS)}>
					{#if isShell}
						Always allow everywhere
					{:else}
						Always allow <pre>{request.toolName}</pre>
						tool
					{/if}
				</DropdownMenu.Item>

				{#if !isShell}
					<DropdownMenu.Item onclick={() => decide(ToolPermissionDecision.ALWAYS_SERVER)}>
						Always allow all tools from {providerName}
					</DropdownMenu.Item>
				{/if}
			</DropdownMenu.Content>
		</DropdownMenu.Root>

		<Button onclick={() => decide(ToolPermissionDecision.DENY)} size="sm" variant="destructive">
			Deny
		</Button>
	{/snippet}
</ChatMessageActionCard>
