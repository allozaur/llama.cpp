<script lang="ts">
	// The Background tasks card: shell commands running on llama-server, with
	// their status and a Stop key; opening one shows its output.

	import ChatSideCard from './ChatSideCard.svelte';
	import { ActionIcon } from '@ggml-org/llama-ui/app/actions';
	import { cn } from '@ggml-org/llama-ui/utils';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import Check from '@lucide/svelte/icons/check';
	import CircleStop from '@lucide/svelte/icons/circle-stop';
	import Eraser from '@lucide/svelte/icons/eraser';
	import Loader2 from '@lucide/svelte/icons/loader-2';
	import MessageSquare from '@lucide/svelte/icons/message-square';
	import Square from '@lucide/svelte/icons/square';
	import SquareTerminal from '@lucide/svelte/icons/square-terminal';
	import XCircle from '@lucide/svelte/icons/x-circle';
	import TerminalOutput from '#lib/components/app/content/TerminalOutput.svelte';
	import { BackgroundTaskStatus } from '#lib/enums/index.ts';
	import type { BackgroundTask } from '#lib/types/index.ts';
	import { abbreviateHome, formatPerformanceTime } from '#lib/utils/index.ts';

	interface Props {
		class?: string;
		/** The conversation on screen; tasks other chats started link to theirs. */
		activeConversationId?: string | null;
		/** Builds the link to the conversation that started a task. */
		conversationHref?: (conversationId: string) => string;
		/** In the side column: fills its width instead of sizing itself. */
		docked?: boolean;
		home?: string | null;
		isStopping?: (key: string) => boolean;
		/** Time used for running tasks' elapsed time, ticks once a second. */
		now?: number;
		onClearFinished?: () => void;
		onClose?: () => void;
		onOpen?: (key: string) => void;
		onStop?: (key: string) => void;
		open?: boolean;
		openTask?: BackgroundTask | null;
		tasks: readonly BackgroundTask[];
	}

	let {
		activeConversationId = null,
		class: className,
		conversationHref,
		docked = false,
		home = null,
		isStopping = () => false,
		now = Date.now(),
		onClearFinished,
		onClose,
		onOpen,
		onStop,
		open = $bindable(true),
		openTask = null,
		tasks
	}: Props = $props();

	const runningCount = $derived(
		tasks.filter((t) => t.status === BackgroundTaskStatus.RUNNING).length
	);
	const hasFinished = $derived(runningCount < tasks.length);

	function elapsed(task: BackgroundTask): string {
		return formatPerformanceTime((task.endedAt ?? now) - task.startedAt).replace(/\.\ds$/, 's');
	}

	function statusLabel(task: BackgroundTask): string {
		if (task.status === BackgroundTaskStatus.RUNNING) return 'running';

		if (task.status === BackgroundTaskStatus.STOPPED) return 'stopped';

		return `exit ${task.exitCode ?? '?'}`;
	}
</script>

{#snippet statusIcon(task: BackgroundTask)}
	{#if task.status === BackgroundTaskStatus.RUNNING}
		<Loader2 aria-label="Running" class="size-icon-xs shrink-0 animate-spin text-fg-info" />
	{:else if task.status === BackgroundTaskStatus.STOPPED}
		<CircleStop aria-label="Stopped" class="size-icon-xs shrink-0 text-muted-foreground" />
	{:else if task.exitCode === 0}
		<Check aria-label="Exited" class="size-icon-xs shrink-0 text-fg-success" />
	{:else}
		<XCircle aria-label="Failed" class="size-icon-xs shrink-0 text-fg-danger" />
	{/if}
{/snippet}

{#snippet stopKey(task: BackgroundTask)}
	{#if task.status === BackgroundTaskStatus.RUNNING}
		<ActionIcon
			ariaLabel="Stop task"
			disabled={isStopping(task.key)}
			icon={isStopping(task.key) ? Loader2 : Square}
			iconSize="size-icon-xs"
			onclick={() => onStop?.(task.key)}
			stopPropagationOnClick
			tooltip="Stop"
		/>
	{/if}
{/snippet}

<ChatSideCard
	bind:open
	class={cn(openTask ? 'w-[min(30rem,calc(100vw-2rem))]' : 'w-72', className)}
	count={runningCount > 0 ? runningCount : undefined}
	icon={SquareTerminal}
	title="Background tasks"
>
	{#snippet actions()}
		{#if !openTask && hasFinished}
			<ActionIcon
				ariaLabel="Clear finished tasks"
				icon={Eraser}
				iconSize="size-icon-xs"
				onclick={() => onClearFinished?.()}
				tooltip="Clear finished"
			/>
		{/if}
	{/snippet}

	{#if openTask}
		<div class="flex flex-col gap-2 px-2 pb-2">
			<div class="flex items-center gap-1">
				<ActionIcon
					ariaLabel="Back to all tasks"
					icon={ArrowLeft}
					iconSize="size-icon-xs"
					onclick={() => onClose?.()}
					tooltip="All tasks"
				/>

				{@render statusIcon(openTask)}

				<code class="min-w-0 flex-1 truncate font-mono text-caption" title={openTask.command}>
					{openTask.command}
				</code>

				<span class="shrink-0 text-caption-sm text-muted-foreground tabular-nums">
					{statusLabel(openTask)} &middot; {elapsed(openTask)}
				</span>

				{@render stopKey(openTask)}
			</div>

			<TerminalOutput
				class={cn('rounded-md px-3 py-2', docked ? 'h-[60dvh]' : 'h-80 max-h-[50dvh]')}
				output={openTask.output}
			/>

			{#if openTask.cwd}
				<p
					class="truncate px-1 font-mono text-caption-sm text-muted-foreground"
					title={openTask.cwd}
				>
					{abbreviateHome(openTask.cwd, home)}
				</p>
			{/if}
		</div>
	{:else}
		<ul class="flex max-h-80 flex-col overflow-y-auto px-1.5 pb-1.5">
			{#each tasks as task (task.key)}
				<li class="group flex items-center gap-1 rounded-md hover:bg-muted/60">
					<button
						class="flex min-w-0 flex-1 cursor-pointer items-start gap-2 px-1.5 py-1.5 text-left"
						onclick={() => onOpen?.(task.key)}
						title="Show output"
						type="button"
					>
						<span class="mt-0.5">{@render statusIcon(task)}</span>

						<span class="flex min-w-0 flex-1 flex-col">
							<code class="truncate font-mono text-caption">{task.command}</code>

							<span class="truncate text-caption-sm text-muted-foreground tabular-nums">
								{[statusLabel(task), elapsed(task), task.cwd && abbreviateHome(task.cwd, home)]
									.filter(Boolean)
									.join(' · ')}
							</span>
						</span>
					</button>

					{#if conversationHref && task.conversationId && task.conversationId !== activeConversationId}
						<ActionIcon
							ariaLabel="Open the chat that started it"
							href={conversationHref(task.conversationId)}
							icon={MessageSquare}
							iconSize="size-icon-xs"
							tooltip="Open its chat"
						/>
					{/if}

					{@render stopKey(task)}
				</li>
			{/each}
		</ul>
	{/if}
</ChatSideCard>
