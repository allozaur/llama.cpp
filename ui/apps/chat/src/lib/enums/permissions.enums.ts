/** What a permission rule does with a tool call it matches. */
export enum PermissionEffect {
	ALLOW = 'allow',
	ASK = 'ask',
	DENY = 'deny'
}

/** How tool calls that no rule decides are handled. */
export enum PermissionMode {
	/** Also run file writes and edits inside the working folder without asking. */
	ACCEPT_EDITS = 'accept_edits',
	/** Ask for every call no rule decides. */
	ASK = 'ask',
	/** Run every call no rule denies, except the commands no mode may run. */
	AUTO = 'auto',
	/** Refuse tools that can change files or run commands. */
	READ_ONLY = 'read_only'
}
