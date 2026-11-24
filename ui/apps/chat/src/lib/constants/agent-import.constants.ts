import { AgentImportSource } from '#lib/enums/agent-import.enums.ts';

export interface AgentImportSourceInfo {
	/** Where the app keeps its sessions, shown as a hint for the folder picker. */
	location: string;
	name: string;
}

export const AGENT_IMPORT_SOURCES: Record<AgentImportSource, AgentImportSourceInfo> = {
	[AgentImportSource.CLAUDE_CODE]: {
		location: '~/.claude/projects',
		name: 'Claude Code'
	}
};

/** Order of the sources on screen. */
export const AGENT_IMPORT_SOURCE_ORDER = [AgentImportSource.CLAUDE_CODE];

/** Sessions written to the database in one transaction. */
export const AGENT_IMPORT_BATCH_SIZE = 20;

/** Bytes read from the start of a file to detect its source. */
export const AGENT_IMPORT_SNIFF_BYTES = 4096;

/**
 * A user message that starts with one of these tags was written by the harness, not typed
 * by the user (command output, reminders, notifications). It is not imported.
 */
export const AGENT_IMPORT_HARNESS_TAGS = [
	'artifact-content-authored-by-others',
	'artifact-view-context',
	'bash-input',
	'bash-stderr',
	'bash-stdout',
	'ci-monitor-event',
	'command-message',
	'command-name',
	'create-pr-command',
	'local-command-caveat',
	'local-command-stderr',
	'local-command-stdout',
	'side-sessions-event',
	'system-reminder',
	'task-notification'
];
