<script lang="ts">
	// A conversation's context breakdown: how much of the window is used, a bar
	// split by part, a row per part, and, in full, a folding group per part
	// with its items. The context gauge's panel shows it without the groups,
	// the Context side card with them.

	import ContextBreakdownGroup from './ContextBreakdownGroup.svelte';
	import ContextBreakdownList from './ContextBreakdownList.svelte';
	import ContextUsageBar from './ContextUsageBar.svelte';
	import type { ContextBreakdownRow, ContextUsageBarSegment } from './types';
	import {
		CONTEXT_DEFERRED_SWATCH,
		CONTEXT_SEGMENT_COLORS,
		CONTEXT_SEGMENT_LABELS
	} from '#lib/constants/index.ts';
	import { ContextSegment } from '#lib/enums/index.ts';
	import {
		type ContextBreakdown,
		type ContextBreakdownPart,
		contextShare,
		formatContextShare,
		formatTokenCount
	} from '#lib/utils/index.ts';

	interface Props {
		breakdown: ContextBreakdown;
		class?: string;
		/** Fold each part's items under the rows. */
		groups?: boolean;
		/** A text class for the "% used" figure, e.g. the gauge's warning colour. */
		levelClass?: string;
	}

	let { breakdown, class: className, groups = false, levelClass }: Props = $props();

	const ESTIMATE_HINT = 'Estimated from the characters sent, at about 4 a token.';

	function hintOf(part: ContextBreakdownPart, deferred: boolean): string | undefined {
		if (deferred) {
			return 'Listed by name in the tool_search tool and loaded into the context when the model asks for one. Size estimated.';
		}

		switch (part.segment) {
			case ContextSegment.MESSAGES:
				return part.estimated
					? ESTIMATE_HINT
					: "The rest of llama-server's count once the system prompt and tools are taken out: exact in sum, its split by role estimated.";
			case ContextSegment.FREE:
				return "The model's context size (n_ctx) less what is used.";
			default:
				return part.estimated ? ESTIMATE_HINT : undefined;
		}
	}

	const total = $derived(breakdown.total);
	const share = $derived(contextShare(breakdown.used, total));
	// a light chat on a large window still shows some use: one decimal below 10%
	const percent = $derived(
		share === null ? null : share < 10 ? Number(share.toFixed(1)) : Math.round(share)
	);
	const segments = $derived<ContextUsageBarSegment[]>(
		breakdown.parts
			.filter((part) => part.segment !== ContextSegment.FREE)
			.map((part) => ({
				colorClass: CONTEXT_SEGMENT_COLORS[part.segment],
				key: part.segment,
				label: `${CONTEXT_SEGMENT_LABELS[part.segment]}: ${formatTokenCount(part.tokens)}`,
				value: part.tokens
			}))
	);
	const rows = $derived<ContextBreakdownRow[]>([
		...breakdown.parts.map((part) => ({
			colorClass: CONTEXT_SEGMENT_COLORS[part.segment],
			hint: hintOf(part, false),
			key: part.segment,
			label: CONTEXT_SEGMENT_LABELS[part.segment],
			share: formatContextShare(contextShare(part.tokens, total)),
			value: formatTokenCount(part.tokens)
		})),
		...breakdown.deferred.map((part) => ({
			colorClass: CONTEXT_DEFERRED_SWATCH,
			hint: hintOf(part, true),
			key: `${part.segment}-deferred`,
			label: `${CONTEXT_SEGMENT_LABELS[part.segment]} (deferred)`,
			share: '—',
			value: formatTokenCount(part.tokens)
		}))
	]);
	const groupList = $derived(
		[
			...breakdown.parts.map((part) => ({ deferred: false, part })),
			...breakdown.deferred.map((part) => ({ deferred: true, part }))
		]
			.filter(({ part }) => part.items.length > 0)
			.map(({ deferred, part }) => ({
				colorClass: deferred ? CONTEXT_DEFERRED_SWATCH : CONTEXT_SEGMENT_COLORS[part.segment],
				items: part.items.map((item) => ({
					detail: item.detail,
					key: item.key,
					label: item.label,
					value: formatTokenCount(item.tokens)
				})),
				key: `${part.segment}${deferred ? '-deferred' : ''}`,
				title: `${CONTEXT_SEGMENT_LABELS[part.segment]}${deferred ? ' (deferred)' : ''}`
			}))
	);
</script>

<div class={['flex flex-col gap-3', className]}>
	<div class="flex items-baseline justify-between gap-2 text-body-sm">
		<span>
			{#if percent !== null}
				<span class={['font-medium', levelClass]}>{percent}%</span>

				<span class="text-muted-foreground">used</span>
			{:else}
				<span class="text-muted-foreground">Context size unknown</span>
			{/if}
		</span>

		<span class="font-mono text-caption text-muted-foreground tabular-nums">
			{formatTokenCount(breakdown.used)} / {total !== null ? formatTokenCount(total) : '—'}
		</span>
	</div>

	{#if total !== null && total > 0}
		<ContextUsageBar aria-label="Context used" {segments} {total} />
	{/if}

	<ContextBreakdownList aria-label="Context by part" {rows} />

	{#if groups && groupList.length > 0}
		<div class="flex flex-col border-t border-border/50 pt-2">
			{#each groupList as group (group.key)}
				<ContextBreakdownGroup
					colorClass={group.colorClass}
					items={group.items}
					title={group.title}
				/>
			{/each}
		</div>
	{/if}
</div>
