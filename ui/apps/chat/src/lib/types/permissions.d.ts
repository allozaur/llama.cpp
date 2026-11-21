import type { PermissionEffect, PermissionMode } from '#lib/enums/index.ts';

/** A shell command split into the simple commands it runs. */
export interface ShellCommandParts {
	/** Substitution, subshells, unbalanced quotes or an over-long line: never allowed by a pattern. */
	complex: boolean;
	segments: string[];
}

/**
 * A remembered answer to a permission prompt, or one the user wrote. A rule
 * without a pattern covers every call of its tool; with one, only shell
 * commands that match it. A rule with a folder covers calls made there and
 * in folders inside it.
 */
export interface PermissionRule {
	id: string;
	/** The tool's key, as `toolsStore` reports it. */
	tool: string;
	/** A shell command pattern such as `npm run test *`. */
	pattern?: string;
	effect: PermissionEffect;
	/** The working folder the rule is limited to. */
	cwd?: string;
	createdAt: number;
}

/** What a permission check knows about a tool call. */
export interface PermissionCheck {
	toolKey: string;
	toolName: string;
	/** The command, for the shell tool. */
	command?: string;
	/** The path a file tool writes, when it names one. */
	path?: string;
	/** Whether the tool can change files or run commands. */
	writes: boolean;
	/** Whether the tool writes files only (write_file, edit_file). */
	editsFiles: boolean;
	cwd?: string;
	mode: PermissionMode;
}

export interface PermissionVerdict {
	effect: PermissionEffect;
	/** Why, for a denial the model reads. */
	reason?: string;
	/** For the shell tool: the parts no rule allowed, each with a proposed pattern. */
	pending?: Array<{ segment: string; pattern: string }>;
}

/** A permission prompt waiting for the user. */
export interface PermissionRequest {
	toolName: string;
	toolKey: string;
	serverLabel: string;
	command?: string;
	/** Proposed patterns for the parts of a shell command that need approval. */
	patterns: string[];
	cwd?: string;
}

/** The user's answer to a permission prompt. */
export interface PermissionAnswer {
	/** Patterns to remember instead of the proposed ones, for the shell tool. */
	patterns?: string[];
}
