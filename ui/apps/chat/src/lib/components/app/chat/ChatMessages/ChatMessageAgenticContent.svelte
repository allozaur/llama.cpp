<script lang="ts">
	import ChatMessageToolCallBlock from './ChatMessage/ChatMessageToolCall/ChatMessageToolCallBlock.svelte';
	import ChatMessageToolCallGroup from './ChatMessage/ChatMessageToolCall/ChatMessageToolCallGroup.svelte';
	import {
		groupToolCallRuns,
		isToolCallSection
	} from './ChatMessage/ChatMessageToolCall/parsers/tool-call-phrasing';
	import ChatMessageReasoningBlock from './ChatMessageReasoningBlock.svelte';
	import {
		ChatMessageActionCardContinueRequest,
		ChatMessageActionCardPermissionRequest,
		ChatMessageStatistics,
		MarkdownContent
	} from '#lib/components/app/index.ts';
	import { TOOL_CALL_GROUP_MIN_CALLS } from '#lib/constants/index.ts';
	import {
		AgenticSectionType,
		ChatMessageStatsView,
		ToolPermissionDecision
	} from '#lib/enums/index.ts';
	import { agenticStore, conversationsStore, settingsStore } from '#lib/stores/index.ts';
	import type {
		AgenticSection,
		ChatMessageAgenticTimings,
		ChatMessageAgenticTurnStats,
		DatabaseMessage
	} from '#lib/types/index.ts';
	import { deriveAgenticSections, isSectionExpandedByDefault } from '#lib/utils/index.ts';

	interface Props {
		message: DatabaseMessage;
		toolMessages?: DatabaseMessage[];
		isStreaming?: boolean;
		isLastAssistantMessage?: boolean;
	}

	let {
		isLastAssistantMessage = false,
		isStreaming: isChatStreaming = false,
		message,
		toolMessages = []
	}: Props = $props();

	// The chat-level streaming flag is shared by every message; only the last
	// assistant message is actually live, so earlier ones must not keep their
	// unresolved tool calls spinning while a newer reply streams.
	const isStreaming = $derived(isChatStreaming && isLastAssistantMessage);

	let expandedStates: Record<number, boolean> = $state({});
	// keyed by the flat index of the group's first call
	let groupExpandedStates: Record<number, boolean> = $state({});

	const showThoughtInProgress = $derived(Boolean(settingsStore.config.showThoughtInProgress));
	const showToolCallInProgress = $derived(Boolean(settingsStore.config.showToolCallInProgress));
	const alwaysShowToolCallContent = $derived(
		Boolean(settingsStore.config.alwaysShowToolCallContent)
	);
	const showMessageStats = $derived(Boolean(settingsStore.config.showMessageStats));
	const showAgenticTurnStats = $derived(
		showMessageStats && Boolean(settingsStore.config.showAgenticTurnStats)
	);

	const hasReasoningError = $derived(
		isLastAssistantMessage ? !!agenticStore.getLastError(message.convId) : false
	);

	const pendingPermission = $derived(
		isStreaming ? agenticStore.getPendingPermissionRequest(message.convId) : null
	);

	// dismissal applies to the request object, so the next request ( new
	// identity ) shows the card again without any reset bookkeeping
	let dismissedPermission: typeof pendingPermission = $state(null);

	const visiblePermission = $derived(
		pendingPermission && dismissedPermission !== pendingPermission ? pendingPermission : null
	);

	function handlePermission(decision: ToolPermissionDecision) {
		dismissedPermission = pendingPermission;
		agenticStore.resolvePermission(message.convId, decision);
	}

	const pendingContinue = $derived(
		isStreaming ? agenticStore.getPendingContinueRequest(message.convId) : false
	);

	let continueDismissed = $state(false);

	// the continue request is a plain boolean, so there is no identity to
	// compare against; clear the dismissal whenever no request is pending so
	// the next one starts from a clean state
	$effect(() => {
		if (!pendingContinue) {
			continueDismissed = false;
		}
	});

	const showContinue = $derived(Boolean(pendingContinue) && !continueDismissed);

	function handleContinue(shouldContinue: boolean) {
		continueDismissed = true;
		agenticStore.resolveContinue(message.convId, shouldContinue);
	}

	const sections = $derived(deriveAgenticSections(message, toolMessages, [], isStreaming));

	const currentlyExecutingToolCallId = $derived(
		isStreaming ? agenticStore.getExecutingToolCallId(message.convId) : null
	);

	// Cwd the agentic loop passes to tool calls in this conversation; the exec
	// block shows it until the result message persists the real one.
	const conversationCwd = $derived(
		conversationsStore.activeConversation?.id === message.convId
			? conversationsStore.activeConversation?.cwd
			: undefined
	);

	type TurnGroup = {
		sections: AgenticSection[];
		flatIndices: number[];
		/** Flat indices of single sections, and runs of tool calls shown as one group row */
		items: (number | number[])[];
	};

	const turnGroups: TurnGroup[] = $derived.by(() => {
		const groups: TurnGroup[] = [];

		let currentTurn: AgenticSection[] = [];
		let currentIndices: number[] = [];
		let prevWasTool = false;

		const pushTurn = () => {
			groups.push({
				flatIndices: currentIndices,
				items: groupToolCallRuns(sections, currentIndices, TOOL_CALL_GROUP_MIN_CALLS),
				sections: currentTurn
			});
		};

		for (let i = 0; i < sections.length; i++) {
			const section = sections[i];
			const isTool = isToolCallSection(section);

			if (!isTool && prevWasTool && currentTurn.length > 0) {
				pushTurn();
				currentTurn = [];
				currentIndices = [];
			}

			currentTurn.push(section);
			currentIndices.push(i);
			prevWasTool = isTool;
		}

		if (currentTurn.length > 0) {
			pushTurn();
		}

		return groups;
	});

	function isExecutingCall(section: AgenticSection): boolean {
		return section.toolCallId !== undefined && section.toolCallId === currentlyExecutingToolCallId;
	}

	function isExpanded(index: number, section: AgenticSection, inOpenGroup = false): boolean {
		if (expandedStates[index] !== undefined) {
			return expandedStates[index];
		}

		// opening a group while a call runs shows that call's live output
		if (inOpenGroup && isExecutingCall(section)) return true;

		return isSectionExpandedByDefault(section, {
			alwaysShowToolCallContent,
			executingToolCallId: currentlyExecutingToolCallId,
			showThoughtInProgress,
			showToolCallInProgress
		});
	}

	function toggleExpanded(index: number, section: AgenticSection, inOpenGroup = false) {
		const currentState = isExpanded(index, section, inOpenGroup);

		expandedStates[index] = !currentState;
	}

	function isGroupExpanded(indices: number[]): boolean {
		const state = groupExpandedStates[indices[0]];

		if (state !== undefined) return state;

		if (alwaysShowToolCallContent) return true;

		return (
			showToolCallInProgress &&
			indices.some((i) =>
				isSectionExpandedByDefault(sections[i], {
					alwaysShowToolCallContent,
					executingToolCallId: currentlyExecutingToolCallId,
					showThoughtInProgress,
					showToolCallInProgress
				})
			)
		);
	}

	function toggleGroupExpanded(indices: number[]) {
		groupExpandedStates[indices[0]] = !isGroupExpanded(indices);
	}

	function buildTurnAgenticTimings(stats: ChatMessageAgenticTurnStats): ChatMessageAgenticTimings {
		return {
			llm: stats.llm,
			toolCalls: stats.toolCalls,
			toolCallsCount: stats.toolCalls.length,
			toolsMs: stats.toolsMs,
			turns: 1
		};
	}
</script>

{#snippet renderSection(section: AgenticSection, index: number, inOpenGroup = false)}
	{#if section.type === AgenticSectionType.TEXT}
		<div class="agentic-text">
			<MarkdownContent attachments={message?.extra} content={section.content} />
		</div>
	{:else if section.type === AgenticSectionType.REASONING || section.type === AgenticSectionType.REASONING_PENDING}
		<ChatMessageReasoningBlock
			attachments={message?.extra}
			{hasReasoningError}
			{isStreaming}
			onToggle={() => toggleExpanded(index, section)}
			open={isExpanded(index, section)}
			{section}
		/>
	{:else if section.type === AgenticSectionType.TOOL_CALL || section.type === AgenticSectionType.TOOL_CALL_PENDING || section.type === AgenticSectionType.TOOL_CALL_STREAMING}
		<ChatMessageToolCallBlock
			attachments={section.toolResultExtras}
			{conversationCwd}
			isExecuting={isExecutingCall(section)}
			{isStreaming}
			onToggle={() => toggleExpanded(index, section, inOpenGroup)}
			open={isExpanded(index, section, inOpenGroup)}
			{section}
		/>
	{/if}
{/snippet}

{#snippet renderItem(item: number | number[])}
	{#if Array.isArray(item)}
		{@const groupOpen = isGroupExpanded(item)}
		<ChatMessageToolCallGroup
			executingToolCallId={currentlyExecutingToolCallId}
			{isStreaming}
			onToggle={() => toggleGroupExpanded(item)}
			open={groupOpen}
			sections={item.map((i) => sections[i])}
		>
			{#each item as index (index)}
				{@render renderSection(sections[index], index, groupOpen)}
			{/each}
		</ChatMessageToolCallGroup>
	{:else}
		{@render renderSection(sections[item], item)}
	{/if}
{/snippet}

<div class="agentic-content gap-2">
	{#if turnGroups.length > 1}
		{#each turnGroups as turn, turnIndex (turnIndex)}
			{@const turnStats = message?.timings?.agentic?.perTurn?.[turnIndex]}

			<div class="agentic-turn group/turn grid gap-2">
				{#each turn.items as item (Array.isArray(item) ? `g${item[0]}` : item)}
					{@render renderItem(item)}
				{/each}

				{#if turnStats && showAgenticTurnStats}
					<div class="turn-stats transition-opacity duration-150 mt-1 mb-4">
						<ChatMessageStatistics
							agenticTimings={turnStats.toolCalls.length > 0
								? buildTurnAgenticTimings(turnStats)
								: undefined}
							hideSummary
							initialView={ChatMessageStatsView.GENERATION}
							predictedMs={turnStats.llm.predicted_ms}
							predictedTokens={turnStats.llm.predicted_n}
							promptMs={turnStats.llm.prompt_ms}
							promptTokens={turnStats.llm.prompt_n}
						/>
					</div>
				{/if}
			</div>
		{/each}
	{:else}
		{#each turnGroups[0]?.items ?? [] as item (Array.isArray(item) ? `g${item[0]}` : item)}
			{@render renderItem(item)}
		{/each}
	{/if}

	{#if visiblePermission}
		<ChatMessageActionCardPermissionRequest
			onDecision={handlePermission}
			serverLabel={visiblePermission.serverLabel}
			toolName={visiblePermission.toolName}
		/>
	{/if}

	{#if showContinue}
		<ChatMessageActionCardContinueRequest onDecision={handleContinue} />
	{/if}
</div>

<style>
	.agentic-content {
		display: flex;
		flex-direction: column;
		width: 100%;
		max-width: 48rem;
	}

	.agentic-content > :global(*),
	.agentic-turn > :global(*) {
		min-width: 0;
	}

	.agentic-text {
		width: 100%;
	}

	.turn-stats {
		border-top: 1px solid hsl(var(--surface-muted) / 0.5);
	}
</style>
