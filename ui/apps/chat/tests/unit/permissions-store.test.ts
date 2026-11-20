import {
	ALWAYS_ALLOWED_TOOLS_LOCALSTORAGE_KEY,
	PERMISSION_RULES_LOCALSTORAGE_KEY
} from '#lib/constants/index.ts';
import { PermissionEffect, PermissionMode, ToolPermissionDecision } from '#lib/enums/index.ts';
import { AgenticGates } from '#lib/stores/agentic/gates.svelte.ts';
import { permissionsStore } from '#lib/stores/permissions.svelte.ts';
import type { PermissionCheck, PermissionRequest } from '#lib/types/index.ts';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// node env unit project has no DOM, install a minimal localStorage backed by a Map
beforeAll(() => {
	const store = new Map<string, string>();
	const polyfill: Storage = {
		clear: () => store.clear(),
		getItem: (k) => (store.has(k) ? store.get(k)! : null),
		key: (i) => Array.from(store.keys())[i] ?? null,
		get length() {
			return store.size;
		},
		removeItem: (k) => {
			store.delete(k);
		},
		setItem: (k, v) => {
			store.set(k, String(v));
		}
	};

	(globalThis as unknown as { localStorage: Storage }).localStorage = polyfill;
});

const SHELL = 'server:exec_shell_command';
const CONV = 'conv-1';

function shell(command: string, cwd?: string): PermissionCheck {
	return {
		command,
		cwd,
		editsFiles: false,
		mode: PermissionMode.ASK,
		toolKey: SHELL,
		toolName: 'exec_shell_command',
		writes: true
	};
}

function request(extra: Partial<PermissionRequest> = {}): PermissionRequest {
	return {
		command: 'npm run test -- --run',
		cwd: '/work/app',
		patterns: ['npm run test *'],
		serverLabel: '',
		toolKey: SHELL,
		toolName: 'exec_shell_command',
		...extra
	};
}

// the store is a singleton: empty it between tests
function reset() {
	for (const rule of [...permissionsStore.rules]) permissionsStore.removeRule(rule.id);

	permissionsStore.clearSession(CONV);
	localStorage.clear();
}

beforeEach(reset);

describe('permissionsStore', () => {
	it('turns tools allowed before rules existed into rules, once', async () => {
		// initialize() reads localStorage only in the browser: load a copy of the store that thinks it is in one
		vi.resetModules();
		vi.doMock('$app/env', () => ({ browser: true }));

		const { permissionsStore: store } = await import('#lib/stores/permissions.svelte.ts');

		localStorage.setItem(
			ALWAYS_ALLOWED_TOOLS_LOCALSTORAGE_KEY,
			JSON.stringify(['server:read_file'])
		);
		store.initialize();

		expect(store.hasTool('server:read_file')).toBe(true);
		expect(localStorage.getItem(ALWAYS_ALLOWED_TOOLS_LOCALSTORAGE_KEY)).toBeNull();
		expect(JSON.parse(localStorage.getItem(PERMISSION_RULES_LOCALSTORAGE_KEY)!)).toHaveLength(1);

		vi.doUnmock('$app/env');
	});

	it('does not keep the same rule twice, and revokes only tool-wide allows', () => {
		permissionsStore.allowTool(SHELL);
		permissionsStore.allowTool(SHELL);
		permissionsStore.addRules([
			{ effect: PermissionEffect.ALLOW, pattern: 'npm test *', tool: SHELL }
		]);

		expect(permissionsStore.rules).toHaveLength(2);

		permissionsStore.revokeTool(SHELL);

		expect(permissionsStore.rules.map((rule) => rule.pattern)).toEqual(['npm test *']);
	});

	it('keeps rules for one conversation apart from the others', () => {
		permissionsStore.addSessionRules(CONV, [
			{ effect: PermissionEffect.ALLOW, pattern: 'npm test *', tool: SHELL }
		]);

		expect(permissionsStore.check(shell('npm test'), CONV).effect).toBe(PermissionEffect.ALLOW);
		expect(permissionsStore.check(shell('npm test'), 'other').effect).toBe(PermissionEffect.ASK);
		expect(permissionsStore.rules).toHaveLength(0);
	});
});

describe('AgenticGates.requestPermission', () => {
	it('remembers the edited patterns in the folder when allowed there for good', async () => {
		const gates = new AgenticGates();
		const answer = gates.requestPermission(CONV, request());

		expect(gates.getPendingPermissionRequest(CONV)).toMatchObject({ toolKey: SHELL });

		gates.resolvePermission(CONV, ToolPermissionDecision.ALWAYS_HERE, {
			patterns: ['npm run test *', ' ']
		});

		expect(await answer).toBe(ToolPermissionDecision.ALWAYS_HERE);
		expect(permissionsStore.rules).toMatchObject([
			{ cwd: '/work/app', effect: PermissionEffect.ALLOW, pattern: 'npm run test *', tool: SHELL }
		]);
		expect(permissionsStore.check(shell('npm run test', '/work/app/pkg'), CONV).effect).toBe(
			PermissionEffect.ALLOW
		);
		expect(permissionsStore.check(shell('npm run test', '/elsewhere'), CONV).effect).toBe(
			PermissionEffect.ASK
		);
	});

	it('remembers a tool for this conversation only', async () => {
		const gates = new AgenticGates();
		const answer = gates.requestPermission(
			CONV,
			request({ command: undefined, patterns: [], toolKey: 'mcp:github:create_issue' })
		);

		gates.resolvePermission(CONV, ToolPermissionDecision.SESSION);
		await answer;

		const check: PermissionCheck = {
			editsFiles: false,
			mode: PermissionMode.ASK,
			toolKey: 'mcp:github:create_issue',
			toolName: 'create_issue',
			writes: true
		};

		expect(permissionsStore.check(check, CONV).effect).toBe(PermissionEffect.ALLOW);
		expect(permissionsStore.rules).toHaveLength(0);
	});

	it('remembers nothing for a one-off answer or a denial', async () => {
		const gates = new AgenticGates();

		for (const decision of [ToolPermissionDecision.ONCE, ToolPermissionDecision.DENY]) {
			const answer = gates.requestPermission(CONV, request());

			gates.resolvePermission(CONV, decision);
			await answer;
		}

		expect(permissionsStore.rules).toHaveLength(0);
		expect(permissionsStore.check(shell('npm run test'), CONV).effect).toBe(PermissionEffect.ASK);
	});

	it('denies when the run is stopped while the prompt is open', async () => {
		const gates = new AgenticGates();
		const controller = new AbortController();
		const answer = gates.requestPermission(CONV, request(), controller.signal);

		controller.abort();

		expect(await answer).toBe(ToolPermissionDecision.DENY);
		expect(gates.getPendingPermissionRequest(CONV)).toBeNull();
	});
});
