import type { AgentImportSource, AgentImportStatus } from '#lib/enums/agent-import.enums.ts';

/** A source on the first screen of the import: an app whose sessions were found. */
export interface AgentImportSourceRow {
	/** Session files found for the source. */
	count: number;
	enabled: boolean;
	source: AgentImportSource;
}

/** What an import of one row did. */
export interface AgentImportResult {
	/** Files that could not be read or parsed. */
	failed: number;
	imported: number;
	/** Sessions already in the library, or with nothing to import. */
	skipped: number;
}

/** A row on the second screen of the import: the chat sessions of one source. */
export interface AgentImportItemRow {
	checked: boolean;
	count: number;
	/** Files handled so far while the row is imported. */
	processed: number;
	result?: AgentImportResult;
	source: AgentImportSource;
	status: AgentImportStatus;
}
