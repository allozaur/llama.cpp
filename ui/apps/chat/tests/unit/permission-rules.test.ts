import { PermissionEffect, PermissionMode } from '#lib/enums/index.ts';
import type { PermissionCheck, PermissionRule } from '#lib/types/index.ts';
import {
	evaluatePermission,
	isPathInside,
	isToolDenied,
	PERMISSION_REASONS
} from '#lib/utils/permission-rules.ts';
import {
	matchesShellPattern,
	proposeShellPattern,
	splitShellCommand,
	stripWrappers
} from '#lib/utils/shell-command.ts';
import { describe, expect, it } from 'vitest';

const SHELL = 'server:exec_shell_command';
const WRITE = 'server:write_file';

function shell(command: string, extra: Partial<PermissionCheck> = {}): PermissionCheck {
	return {
		command,
		editsFiles: false,
		mode: PermissionMode.ASK,
		toolKey: SHELL,
		toolName: 'exec_shell_command',
		writes: true,
		...extra
	};
}

function rule(effect: PermissionEffect, extra: Partial<PermissionRule> = {}): PermissionRule {
	return { createdAt: 0, effect, id: Math.random().toString(36), tool: SHELL, ...extra };
}

describe('splitShellCommand', () => {
	it('splits chained commands and keeps quoted operators', () => {
		expect(splitShellCommand('git status && npm test | tee out; echo "a && b"')).toEqual({
			complex: false,
			segments: ['git status', 'npm test', 'tee out', 'echo "a && b"']
		});
	});

	it('treats 2>&1 as a redirection, not a background operator', () => {
		expect(splitShellCommand('npm test 2>&1').segments).toEqual(['npm test 2>&1']);
	});

	it('marks substitution, subshells and open quotes as complex', () => {
		expect(splitShellCommand('echo $(whoami)').complex).toBe(true);
		expect(splitShellCommand('echo `id`').complex).toBe(true);
		expect(splitShellCommand('(cd x && rm y)').complex).toBe(true);
		expect(splitShellCommand('echo "open').complex).toBe(true);
		expect(splitShellCommand("echo '$(not substituted)'").complex).toBe(false);
	});
});

describe('shell patterns', () => {
	it('strips harmless wrappers', () => {
		expect(stripWrappers('timeout 30 nice -n 5 npm test')).toBe('npm test');
	});

	it('proposes a prefix up to the subcommand', () => {
		expect(proposeShellPattern('git log --oneline -5')).toBe('git log *');
		expect(proposeShellPattern('npm run test -- --watch')).toBe('npm run test *');
		expect(proposeShellPattern('ls -la src')).toBe('ls *');
		expect(proposeShellPattern('make')).toBe('make');
	});

	it('matches a trailing " *" with or without arguments, and the whole command only', () => {
		expect(matchesShellPattern('git log', 'git log *')).toBe(true);
		expect(matchesShellPattern('git log --oneline', 'git log *')).toBe(true);
		expect(matchesShellPattern('git logs', 'git log *')).toBe(false);
		expect(matchesShellPattern('npm test', 'npm test')).toBe(true);
		expect(matchesShellPattern('npm test --watch', 'npm test')).toBe(false);
		expect(matchesShellPattern('docker run -it x', 'docker * x')).toBe(true);
	});
});

describe('evaluatePermission', () => {
	it('asks for an unknown command and proposes a pattern', () => {
		expect(evaluatePermission(shell('npm run build'), [])).toEqual({
			effect: PermissionEffect.ASK,
			pending: [{ pattern: 'npm run build', segment: 'npm run build' }]
		});
	});

	it('allows read-only commands without a rule', () => {
		expect(evaluatePermission(shell('ls -la && git status'), []).effect).toBe(
			PermissionEffect.ALLOW
		);
		expect(evaluatePermission(shell('ls > files.txt'), []).effect).toBe(PermissionEffect.ASK);
		expect(evaluatePermission(shell('find . -delete'), []).effect).toBe(PermissionEffect.ASK);
	});

	it('allows a chain only when every command is allowed', () => {
		const rules = [rule(PermissionEffect.ALLOW, { pattern: 'npm test *' })];

		expect(evaluatePermission(shell('npm test && git status'), rules).effect).toBe(
			PermissionEffect.ALLOW
		);
		expect(evaluatePermission(shell('npm test && rm -rf build'), rules)).toEqual({
			effect: PermissionEffect.ASK,
			pending: [{ pattern: 'rm *', segment: 'rm -rf build' }]
		});
	});

	it('never allows a complex command by pattern', () => {
		const rules = [rule(PermissionEffect.ALLOW, { pattern: 'echo *' })];

		expect(evaluatePermission(shell('echo $(cat ~/.ssh/id_rsa)'), rules).effect).toBe(
			PermissionEffect.ASK
		);
	});

	it('lets deny beat allow, and fires on any part of a chain', () => {
		const rules = [
			rule(PermissionEffect.ALLOW),
			rule(PermissionEffect.DENY, { pattern: 'git push *' })
		];

		expect(evaluatePermission(shell('git add . && git push origin main'), rules)).toEqual({
			effect: PermissionEffect.DENY,
			reason: 'Denied by the permission rule "git push *".'
		});
	});

	it('limits a rule to its folder and the folders inside it', () => {
		const rules = [rule(PermissionEffect.ALLOW, { cwd: '/work/app', pattern: 'npm test *' })];

		expect(evaluatePermission(shell('npm test', { cwd: '/work/app/pkg' }), rules).effect).toBe(
			PermissionEffect.ALLOW
		);
		expect(evaluatePermission(shell('npm test', { cwd: '/work/other' }), rules).effect).toBe(
			PermissionEffect.ASK
		);
		expect(evaluatePermission(shell('npm test', { cwd: '/work/application' }), rules).effect).toBe(
			PermissionEffect.ASK
		);
	});

	it('blocks destructive commands in every mode, even with an allow-all rule', () => {
		const rules = [rule(PermissionEffect.ALLOW)];

		for (const command of [
			'rm -rf /',
			'sudo true; rm -fr ~',
			':(){ :|:& };:',
			'mkfs.ext4 /dev/sda1'
		]) {
			expect(evaluatePermission(shell(command, { mode: PermissionMode.AUTO }), rules)).toEqual({
				effect: PermissionEffect.DENY,
				reason: PERMISSION_REASONS.BLOCKED
			});
		}

		expect(evaluatePermission(shell('rm -rf ./build'), rules).effect).toBe(PermissionEffect.ALLOW);
	});

	it('refuses writing tools in read-only mode but still runs read-only commands', () => {
		const readOnly = { mode: PermissionMode.READ_ONLY };

		expect(evaluatePermission(shell('npm install', readOnly), [])).toEqual({
			effect: PermissionEffect.DENY,
			reason: PERMISSION_REASONS.READ_ONLY
		});
		expect(evaluatePermission(shell('git diff', readOnly), []).effect).toBe(PermissionEffect.ALLOW);
	});

	it('runs file edits inside the folder in accept-edits mode', () => {
		const edit = (path: string): PermissionCheck => ({
			cwd: '/work/app',
			editsFiles: true,
			mode: PermissionMode.ACCEPT_EDITS,
			path,
			toolKey: WRITE,
			toolName: 'write_file',
			writes: true
		});

		expect(evaluatePermission(edit('src/a.ts'), []).effect).toBe(PermissionEffect.ALLOW);
		expect(evaluatePermission(edit('/work/app/b.ts'), []).effect).toBe(PermissionEffect.ALLOW);
		expect(evaluatePermission(edit('../secrets'), []).effect).toBe(PermissionEffect.ASK);
		expect(evaluatePermission(edit('/etc/hosts'), []).effect).toBe(PermissionEffect.ASK);
	});

	it('allows everything but denials and blocked commands in auto mode', () => {
		const auto = { mode: PermissionMode.AUTO };
		const rules = [rule(PermissionEffect.ASK, { pattern: 'git push *' })];

		expect(evaluatePermission(shell('npm install', auto), rules).effect).toBe(
			PermissionEffect.ALLOW
		);
		expect(evaluatePermission(shell('git push', auto), rules).effect).toBe(PermissionEffect.ASK);
	});

	it('applies tool rules without a pattern to any tool', () => {
		const check: PermissionCheck = {
			editsFiles: false,
			mode: PermissionMode.ASK,
			toolKey: 'mcp:github:create_issue',
			toolName: 'create_issue',
			writes: true
		};

		expect(evaluatePermission(check, []).effect).toBe(PermissionEffect.ASK);
		expect(
			evaluatePermission(check, [rule(PermissionEffect.ALLOW, { tool: 'mcp:github:create_issue' })])
				.effect
		).toBe(PermissionEffect.ALLOW);
	});
});

describe('helpers', () => {
	it('tells which tools rules refuse outright', () => {
		const rules = [
			rule(PermissionEffect.DENY, { tool: WRITE }),
			rule(PermissionEffect.DENY, { pattern: 'rm *' })
		];

		expect(isToolDenied(WRITE, rules)).toBe(true);
		expect(isToolDenied(SHELL, rules)).toBe(false);
	});

	it('keeps paths with .. out of a folder', () => {
		expect(isPathInside('a/../../b', '/w')).toBe(false);
		expect(isPathInside('/w/x', '/w')).toBe(true);
		expect(isPathInside(undefined, '/w')).toBe(false);
	});
});
