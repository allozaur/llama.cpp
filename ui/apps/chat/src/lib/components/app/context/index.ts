/**
 *
 * CONTEXT
 *
 * Building blocks of the context breakdown, shared by the context gauge's
 * panel and the Context side card.
 *
 */

/**
 * **ContextUsageBar** - A thin bar split into coloured segments
 *
 * One segment per part of a whole, its width the part's share; the track is
 * what is left. A meter for assistive tech.
 */
export { default as ContextUsageBar } from './ContextUsageBar.svelte';

/**
 * **ContextBreakdownList** - Rows of a breakdown
 *
 * Swatch, label (dotted-underlined with a hint on hover), count and share,
 * "—" for a part outside the whole.
 */
export { default as ContextBreakdownList } from './ContextBreakdownList.svelte';

/**
 * **ContextBreakdownGroup** - A folding group of items with counts
 *
 * Title with the number of items, then each item, e.g. "Server · tool  1.2K".
 */
export { default as ContextBreakdownGroup } from './ContextBreakdownGroup.svelte';

/**
 * **ContextBreakdownPanel** - A conversation's context breakdown
 *
 * "% used" and "used / window", the bar, the rows and, with `groups`, the
 * folding groups. Takes a breakdown from `buildContextBreakdown`.
 */
export { default as ContextBreakdownPanel } from './ContextBreakdownPanel.svelte';

export type {
	ContextBreakdownGroupItem,
	ContextBreakdownRow,
	ContextUsageBarSegment
} from './types';
