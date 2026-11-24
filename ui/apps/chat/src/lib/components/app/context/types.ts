export interface ContextUsageBarSegment {
	key: string;
	/** A background class, e.g. bg-fill-info. */
	colorClass: string;
	label: string;
	value: number;
}

export interface ContextBreakdownRow {
	key: string;
	/** The swatch: a background class, or border classes for a hollow one. */
	colorClass: string;
	label: string;
	/** Shown on hover, e.g. that the count is an estimate. */
	hint?: string;
	/** The count, already formatted. */
	value: string;
	/** The share, already formatted; "—" when absent. */
	share?: string;
}

export interface ContextBreakdownGroupItem {
	key: string;
	label: string;
	/** Shown before the label, e.g. the MCP server: "Server · tool". */
	detail?: string;
	/** The count, already formatted. */
	value: string;
}
