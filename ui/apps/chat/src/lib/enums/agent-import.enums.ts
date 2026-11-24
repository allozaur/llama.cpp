/** Apps whose chat sessions can be imported. */
export enum AgentImportSource {
	CLAUDE_CODE = 'claude-code'
}

/** Screens of the import flow. */
export enum AgentImportStep {
	ITEMS = 'items',
	SOURCES = 'sources'
}

/** State of one row on the items screen. */
export enum AgentImportStatus {
	DONE = 'done',
	IDLE = 'idle',
	RUNNING = 'running'
}
