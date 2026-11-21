import { ContextSegment } from '#lib/enums/index.ts';

/**
 * The colour of each part of the context window: the swatch of its row and its share of the bar.
 * Status fills and neutrals only, the design tokens have no data-viz palette; free space is the
 * bar's track.
 */
export const CONTEXT_SEGMENT_COLORS: Record<ContextSegment, string> = {
	[ContextSegment.CUSTOM_TOOLS]: 'bg-fill-warning',
	[ContextSegment.FREE]: 'bg-muted ring-1 ring-border ring-inset',
	[ContextSegment.MCP_TOOLS]: 'bg-fill-info/55',
	[ContextSegment.MESSAGES]: 'bg-fill-success',
	[ContextSegment.SYSTEM_PROMPT]: 'bg-muted-foreground',
	[ContextSegment.SYSTEM_TOOLS]: 'bg-fill-info'
};

/** The swatch of a part that is not in the window, such as tools loaded on demand. */
export const CONTEXT_DEFERRED_SWATCH = 'border border-dashed border-muted-foreground/60';

export const CONTEXT_SEGMENT_LABELS: Record<ContextSegment, string> = {
	[ContextSegment.CUSTOM_TOOLS]: 'Custom tools',
	[ContextSegment.FREE]: 'Free space',
	[ContextSegment.MCP_TOOLS]: 'MCP tools',
	[ContextSegment.MESSAGES]: 'Messages',
	[ContextSegment.SYSTEM_PROMPT]: 'System prompt',
	[ContextSegment.SYSTEM_TOOLS]: 'System tools'
};
