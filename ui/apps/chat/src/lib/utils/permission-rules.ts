/**
 * Permission rules: which tool calls run without asking, which ask, which
 * are refused. Deny beats ask beats allow, whatever the order of the rules.
 * A shell command runs without asking only when every command it chains is
 * allowed; a deny or ask rule fires when any of them matches. These rules
 * spare prompts; the boundary is still what llama-server lets its tools do.
 */

import {
	matchesShellPattern,
	proposeShellPattern,
	shellWords,
	splitShellCommand,
	stripWrappers
} from './shell-command.ts';
import { PermissionEffect, PermissionMode } from '#lib/enums/index.ts';
import type { PermissionCheck, PermissionRule, PermissionVerdict } from '#lib/types/index.ts';

/** Commands that only read, run without asking in every mode. */
const READ_ONLY_COMMANDS = new Set([
	'cat',
	'cd',
	'diff',
	'du',
	'echo',
	'file',
	'find',
	'grep',
	'head',
	'ls',
	'pwd',
	'rg',
	'stat',
	'tail',
	'tree',
	'wc',
	'which'
]);
const READ_ONLY_GIT = new Set(['blame', 'diff', 'log', 'ls-files', 'rev-parse', 'show', 'status']);
// options that make `find` change files
const FIND_WRITE_OPTIONS = new Set(['-delete', '-exec', '-execdir', '-fprint', '-ok', '-okdir']);
// targets `rm -r` may never take
const PROTECTED_TARGETS = new Set(['/', '/*', '~', '~/', '~/*', '$HOME', '$HOME/', '/.']);
const FORK_BOMB = /:\s*\(\s*\)\s*\{\s*:\s*\|\s*:\s*&\s*\}\s*;\s*:/;
const DISK_WRITE = /\bof=\/dev\/(sd|hd|nvme|disk|mmcblk)|>\s*\/dev\/(sd|hd|nvme|disk|mmcblk)/;
const OUTPUT_REDIRECT = /(^|[^<>&\d])\d*>>?(?!&)\s*(?!\/dev\/null\b)\S/;

export const PERMISSION_REASONS = {
	BLOCKED: 'This command is blocked: it could destroy the system or its data.',
	READ_ONLY: 'Read-only mode is on: tools that change files or run commands are refused.'
} as const;

/** Decide a tool call from the rules, the conversation's grants and the mode. */
export function evaluatePermission(
	check: PermissionCheck,
	rules: readonly PermissionRule[]
): PermissionVerdict {
	const applicable = rules.filter((rule) => ruleApplies(rule, check));
	const parts = check.command !== undefined ? splitShellCommand(check.command) : null;
	const segments = parts?.segments ?? [];

	if (check.command !== undefined && isBlockedCommand(check.command, segments)) {
		return { effect: PermissionEffect.DENY, reason: PERMISSION_REASONS.BLOCKED };
	}

	const denied = applicable.find(
		(rule) => rule.effect === PermissionEffect.DENY && ruleMatchesAny(rule, check, segments)
	);

	if (denied) return { effect: PermissionEffect.DENY, reason: denialReason(denied) };

	const readOnlyShell = parts !== null && !parts.complex && segments.every(isReadOnlyCommand);

	if (check.mode === PermissionMode.READ_ONLY && check.writes && !readOnlyShell) {
		return { effect: PermissionEffect.DENY, reason: PERMISSION_REASONS.READ_ONLY };
	}

	const pending = () =>
		segments
			.filter((segment) => parts?.complex || !segmentAllowed(segment, applicable, check))
			.map((segment) => ({ pattern: proposeShellPattern(segment), segment }));

	if (
		applicable.some(
			(rule) => rule.effect === PermissionEffect.ASK && ruleMatchesAny(rule, check, segments)
		)
	) {
		return { effect: PermissionEffect.ASK, pending: parts ? pending() : undefined };
	}

	if (applicable.some((rule) => rule.effect === PermissionEffect.ALLOW && !rule.pattern)) {
		return { effect: PermissionEffect.ALLOW };
	}

	if (parts && !parts.complex && segments.every((s) => segmentAllowed(s, applicable, check))) {
		return { effect: PermissionEffect.ALLOW };
	}

	if (check.mode === PermissionMode.AUTO) return { effect: PermissionEffect.ALLOW };

	if (
		check.mode === PermissionMode.ACCEPT_EDITS &&
		check.editsFiles &&
		check.cwd &&
		isPathInside(check.path, check.cwd)
	) {
		return { effect: PermissionEffect.ALLOW };
	}

	return { effect: PermissionEffect.ASK, pending: parts ? pending() : undefined };
}

/** Whether rules refuse a tool outright here, so it should not be offered to the model at all. */
export function isToolDenied(
	toolKey: string,
	rules: readonly PermissionRule[],
	cwd?: string
): boolean {
	return rules.some(
		(rule) =>
			rule.effect === PermissionEffect.DENY &&
			!rule.pattern &&
			rule.tool === toolKey &&
			cwdApplies(rule, cwd)
	);
}

/** Whether `path` lies inside the folder `cwd`, or is relative to it. */
export function isPathInside(path: string | undefined, cwd: string): boolean {
	if (!path) return false;

	const parts = path.split(/[\\/]+/);

	if (parts.includes('..')) return false;

	if (!path.startsWith('/') && !path.startsWith('~') && !/^[A-Za-z]:/.test(path)) return true;

	return isFolderInside(path, cwd);
}

function isFolderInside(folder: string, root: string): boolean {
	const trim = (p: string) => p.replace(/[\\/]+$/, '') || '/';
	const f = trim(folder);
	const r = trim(root);

	return f === r || f.startsWith(r === '/' ? '/' : `${r}/`);
}

function cwdApplies(rule: PermissionRule, cwd: string | undefined): boolean {
	return !rule.cwd || (!!cwd && isFolderInside(cwd, rule.cwd));
}

function ruleApplies(rule: PermissionRule, check: PermissionCheck): boolean {
	return rule.tool === check.toolKey && cwdApplies(rule, check.cwd);
}

function ruleMatchesAny(rule: PermissionRule, check: PermissionCheck, segments: string[]): boolean {
	if (!rule.pattern) return true;

	if (check.command === undefined) return false;

	return segments.some((segment) => matchesShellPattern(segment, rule.pattern!));
}

function segmentAllowed(
	segment: string,
	rules: readonly PermissionRule[],
	check: PermissionCheck
): boolean {
	if (isReadOnlyCommand(segment)) return true;

	return rules.some(
		(rule) =>
			rule.effect === PermissionEffect.ALLOW &&
			!!rule.pattern &&
			check.command !== undefined &&
			matchesShellPattern(segment, rule.pattern)
	);
}

function isReadOnlyCommand(segment: string): boolean {
	if (OUTPUT_REDIRECT.test(segment)) return false;

	const words = shellWords(stripWrappers(segment));
	const [program, sub] = words;

	if (!program) return false;

	if (program === 'git') return !!sub && READ_ONLY_GIT.has(sub);

	if (program === 'find') return !words.some((word) => FIND_WRITE_OPTIONS.has(word));

	return READ_ONLY_COMMANDS.has(program);
}

function isBlockedCommand(command: string, segments: string[]): boolean {
	if (FORK_BOMB.test(command) || DISK_WRITE.test(command)) return true;

	return segments.some((segment) => {
		const words = shellWords(stripWrappers(segment));
		const program = words[0]?.replace(/^.*\//, '');

		if (program === 'mkfs' || program?.startsWith('mkfs.')) return true;

		if (program !== 'rm') return false;

		const recursive = words.some(
			(word) => word === '--recursive' || /^-[a-zA-Z]*[rR][a-zA-Z]*$/.test(word)
		);

		return recursive && words.some((word) => PROTECTED_TARGETS.has(word));
	});
}

function denialReason(rule: PermissionRule): string {
	return rule.pattern
		? `Denied by the permission rule "${rule.pattern}".`
		: 'Denied by a permission rule for this tool.';
}
