// The model reaches skills through two of the app's own tools, over every source
// of skills on offer: one lists them under where each is from (a folder of the
// machine, an MCP server), one loads the skill a call names. A load asks the
// user for the skill, through the permission card every tool call goes through,
// and the source keeps the answer.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('#lib/services/database.service.ts', () => ({
	DatabaseService: {}
}));

import { ToolPermissionDecision } from '#lib/enums/index.ts';
import { BuiltInTool } from '#lib/enums/index.ts';
import type { SkillEntry, SkillPermission, SkillSource } from '#lib/extensions/index.ts';
import { SkillToolsService } from '#lib/services/skill-tools.service.ts';
import { AgenticGates } from '#lib/stores/agentic/gates.svelte.ts';
import { agenticMode } from '#lib/stores/agentic-mode.svelte.ts';
import { permissionsStore } from '#lib/stores/permissions.svelte.ts';
import { skillsStore } from '#lib/stores/skills.svelte.ts';
import { toolsStore } from '#lib/stores/tools.svelte.ts';

function entry(name: string, origin: string, extra: Partial<SkillEntry> = {}): SkillEntry {
	return { description: `What ${name}\n  is for`, id: `${origin}/${name}`, name, origin, ...extra };
}

const ANIMATE = entry('animate', '~/.agents/skills');
const SWIFT = entry('write-swift', '~/.claude/skills');
const REFUNDS = entry('refunds', 'Support');
const DAILY = entry('daily', 'Support', { isUnverified: true });
// the same name on a server as in a folder
const ANIMATE_ON_SERVER = entry('animate', 'Design');

function source(id: string, originKind: string, entries: SkillEntry[]) {
	const permission: SkillPermission = {
		allow: vi.fn(),
		hasChanged: false,
		isAllowed: false
	};

	return {
		attach: vi.fn(),
		icon: (() => {}) as unknown as SkillSource['icon'],
		id,
		isAvailable: vi.fn(() => true),
		list: vi.fn(async () => entries),
		load: vi.fn(
			async (picked: SkillEntry, file?: string) => `${picked.name}:${file ?? 'SKILL.md'}`
		),
		originKind,
		permission: vi.fn(async () => permission),
		read: vi.fn()
	} satisfies SkillSource;
}

let local: ReturnType<typeof source>;
let mcp: ReturnType<typeof source>;

function call(name: BuiltInTool, args: Record<string, string> = {}) {
	return { arguments: JSON.stringify(args), id: 'call-1', name };
}

beforeEach(() => {
	local = source('local', 'folder', [ANIMATE, SWIFT]);
	mcp = source('mcp', 'MCP server', [REFUNDS, DAILY, ANIMATE_ON_SERVER]);
	vi.spyOn(skillsStore, 'sources', 'get').mockReturnValue([local, mcp]);
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe('list_skills', () => {
	it('lists the skills of every source under where each is from, the unverifiable left out', async () => {
		const { content, isError } = await SkillToolsService.execute(
			call(BuiltInTool.BROWSER_LIST_SKILLS)
		);

		expect(isError).toBe(false);
		expect(content).toContain(
			[
				'From the folder "~/.agents/skills":',
				'- animate: What animate is for',
				'',
				'From the folder "~/.claude/skills":',
				'- write-swift: What write-swift is for',
				'',
				'From the MCP server "Support":',
				'- refunds: What refunds is for',
				'',
				'From the MCP server "Design":',
				'- animate: What animate is for'
			].join('\n')
		);
		expect(content).not.toContain('daily');
	});

	it('leaves out a source that offers nothing now, such as the folders with tools off', async () => {
		local.isAvailable.mockReturnValue(false);

		const { content } = await SkillToolsService.execute(call(BuiltInTool.BROWSER_LIST_SKILLS));

		expect(local.list).not.toHaveBeenCalled();
		expect(content).not.toContain('From the folder');
		expect(content).toContain('From the MCP server "Support"');
	});

	it('keeps the other sources when one fails to list, and says so', async () => {
		mcp.list.mockRejectedValue(new Error('server went away'));

		const { content } = await SkillToolsService.execute(call(BuiltInTool.BROWSER_LIST_SKILLS));

		expect(content).toContain('- animate: What animate is for');
		expect(content).toContain('(the MCP server skills could not be listed: server went away)');
	});

	it('says there are none when no source has any', async () => {
		local.list.mockResolvedValue([]);
		mcp.list.mockResolvedValue([]);

		const { content } = await SkillToolsService.execute(call(BuiltInTool.BROWSER_LIST_SKILLS));

		expect(content).toMatch(/\(no skills\)$/);
	});
});

describe('load_skill', () => {
	it('loads the skill a call names, by its name and where it is from', async () => {
		const { content } = await SkillToolsService.execute(
			call(BuiltInTool.BROWSER_LOAD_SKILL, { from: 'Design', name: 'animate' })
		);

		expect(content).toBe('animate:SKILL.md');
		expect(mcp.load).toHaveBeenCalledWith(ANIMATE_ON_SERVER, undefined);
		expect(local.load).not.toHaveBeenCalled();
	});

	it('passes the file a call names to the source', async () => {
		await SkillToolsService.execute(
			call(BuiltInTool.BROWSER_LOAD_SKILL, {
				file: 'references/guide.md',
				from: 'Support',
				name: 'refunds'
			})
		);

		expect(mcp.load).toHaveBeenCalledWith(REFUNDS, 'references/guide.md');
	});

	it('takes a name only one place has, whatever it is said to be from, and never guesses between two', async () => {
		await SkillToolsService.execute(call(BuiltInTool.BROWSER_LOAD_SKILL, { name: 'write-swift' }));
		// as a small model writes it: the name where the place goes
		await SkillToolsService.execute(
			call(BuiltInTool.BROWSER_LOAD_SKILL, { from: 'refunds', name: 'refunds' })
		);

		expect(local.load).toHaveBeenCalledWith(SWIFT, undefined);
		expect(mcp.load).toHaveBeenCalledWith(REFUNDS, undefined);
		await expect(
			SkillToolsService.execute(call(BuiltInTool.BROWSER_LOAD_SKILL, { name: 'animate' }))
		).rejects.toThrow(
			'More than one skill is named "animate": give "from", one of "~/.agents/skills", "Design".'
		);
		await expect(
			SkillToolsService.execute(
				call(BuiltInTool.BROWSER_LOAD_SKILL, { from: 'Billing', name: 'animate' })
			)
		).rejects.toThrow('More than one skill is named "animate"');
		await expect(
			SkillToolsService.execute(call(BuiltInTool.BROWSER_LOAD_SKILL, { from: 'Support' }))
		).rejects.toThrow('"name" is missing');
	});

	it('does not load a skill whose files cannot be verified', async () => {
		await expect(
			SkillToolsService.execute(
				call(BuiltInTool.BROWSER_LOAD_SKILL, { from: 'Support', name: 'daily' })
			)
		).rejects.toThrow('No skill "daily"');
		expect(mcp.load).not.toHaveBeenCalled();
	});

	it('passes on the refusal of a source the user did not allow the skill in', async () => {
		local.load.mockRejectedValue(new Error('The user has not allowed the skill "animate".'));

		await expect(
			SkillToolsService.execute(
				call(BuiltInTool.BROWSER_LOAD_SKILL, { from: '~/.agents/skills', name: 'animate' })
			)
		).rejects.toThrow('has not allowed');
	});
});

describe('the tools in the tool list', () => {
	beforeEach(() => {
		// as against a llama-server started with --agent
		agenticMode.serverHasTools = true;
	});

	const names = () => toolsStore.allTools.map((tool) => tool.definition.function.name);

	it('are on offer while a source offers skills, as the app own browser tools', () => {
		local.isAvailable.mockReturnValue(false);

		expect(names()).toEqual(
			expect.arrayContaining([BuiltInTool.BROWSER_LIST_SKILLS, BuiltInTool.BROWSER_LOAD_SKILL])
		);

		const load = toolsStore.allTools.find(
			(tool) => tool.definition.function.name === BuiltInTool.BROWSER_LOAD_SKILL
		);
		const list = toolsStore.allTools.find(
			(tool) => tool.definition.function.name === BuiltInTool.BROWSER_LIST_SKILLS
		);

		expect(load?.callPermission).toBeTypeOf('function');
		expect(list?.callPermission).toBeUndefined();
	});

	it('are not on offer while no source offers skills, e.g. tools off and no server with skills', () => {
		local.isAvailable.mockReturnValue(false);
		mcp.isAvailable.mockReturnValue(false);

		expect(names()).not.toContain(BuiltInTool.BROWSER_LIST_SKILLS);
		expect(names()).not.toContain(BuiltInTool.BROWSER_LOAD_SKILL);
	});
});

describe('permission of a load', () => {
	const LOAD_ANIMATE = call(BuiltInTool.BROWSER_LOAD_SKILL, {
		from: '~/.agents/skills',
		name: 'animate'
	});

	beforeEach(() => {
		agenticMode.serverHasTools = true;
	});

	it('asks for the skill and where it is from, not for the tool', async () => {
		local.permission.mockResolvedValue({
			allow: vi.fn(),
			detail: { component: (() => {}) as never, props: { path: '~/.agents/skills/animate' } },
			hasChanged: true,
			isAllowed: false
		});

		const gates = new AgenticGates();
		const decision = gates.requestPermission('conv-1', LOAD_ANIMATE, 'Browser Tools');

		await vi.waitFor(() => expect(gates.getPendingPermissionRequest('conv-1')).not.toBeNull());

		const pending = gates.getPendingPermissionRequest('conv-1')!;

		expect(local.permission).toHaveBeenCalledWith(ANIMATE);
		expect(pending).toMatchObject({
			permission: { alwaysLabel: 'Always allow this skill', subject: 'the skill animate' },
			serverLabel: '~/.agents/skills',
			toolName: BuiltInTool.BROWSER_LOAD_SKILL
		});
		expect(pending.permission?.detail?.props).toEqual({ path: '~/.agents/skills/animate' });

		gates.resolvePermission('conv-1', ToolPermissionDecision.DENY);
		await expect(decision).resolves.toBe(ToolPermissionDecision.DENY);
	});

	it.each([
		[ToolPermissionDecision.ONCE, false],
		[ToolPermissionDecision.ALWAYS, true]
	])('keeps the answer %s with the source, never with the tool', async (answer, always) => {
		const allow = vi.fn();
		const allowTool = vi.spyOn(permissionsStore, 'allowTool');

		local.permission.mockResolvedValue({ allow, hasChanged: false, isAllowed: false });

		const gates = new AgenticGates();
		const decision = gates.requestPermission('conv-1', LOAD_ANIMATE, '');

		await vi.waitFor(() => expect(gates.getPendingPermissionRequest('conv-1')).not.toBeNull());
		gates.resolvePermission('conv-1', answer);

		await expect(decision).resolves.toBe(answer);
		expect(allow).toHaveBeenCalledWith(always);
		expect(allowTool).not.toHaveBeenCalled();
	});

	it('does not ask for a skill the user allowed', async () => {
		local.permission.mockResolvedValue({ allow: vi.fn(), hasChanged: false, isAllowed: true });

		await expect(new AgenticGates().requestPermission('conv-1', LOAD_ANIMATE, '')).resolves.toBe(
			ToolPermissionDecision.ONCE
		);
	});

	it('asks nothing for a call that names no skill: the call fails saying why', async () => {
		const unknown = call(BuiltInTool.BROWSER_LOAD_SKILL, { name: 'unknown' });

		await expect(new AgenticGates().requestPermission('conv-1', unknown, '')).resolves.toBe(
			ToolPermissionDecision.ONCE
		);
		expect(local.permission).not.toHaveBeenCalled();
		expect(mcp.permission).not.toHaveBeenCalled();
		await expect(SkillToolsService.execute(unknown)).rejects.toThrow('No skill "unknown"');
	});
});
