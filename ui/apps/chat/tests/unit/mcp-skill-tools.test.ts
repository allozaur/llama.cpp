// The model reaches skills through two tools of the MCP tool provider: one
// lists the skills of the servers in use, under each server's name, and one
// loads a skill from the server the model names. A load asks the user for the
// skill, through the permission every tool call goes through.

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('#lib/services/database.service.ts', () => ({
	DatabaseService: {}
}));
// the component draws on the app's component barrel, which needs a browser
vi.mock('#lib/extensions/mcp/components/contributions/McpToolGroupIdentity.svelte', () => ({
	default: () => {}
}));
vi.mock('#lib/extensions/mcp/components/skills/McpSkillPermissionDetail.svelte', () => ({
	default: () => {}
}));

import type { Skill, SkillFile } from '@modelcontextprotocol/client/ext/skills';
import { SETTINGS_KEYS } from '#lib/constants/index.ts';
import { ToolPermissionDecision } from '#lib/enums/index.ts';
import type { ExtensionContext, ToolProvider } from '#lib/extensions/index.ts';
import { extensions } from '#lib/extensions/index.ts';
import { MCP_SKILLS_TOOL_GROUP_ID, McpSkillTool } from '#lib/extensions/mcp/skills/constants.ts';
import { mcpStore } from '#lib/extensions/mcp/stores/index.svelte.ts';
import { contributeTools } from '#lib/extensions/mcp/tools.ts';
import { AgenticGates } from '#lib/stores/agentic/gates.svelte.ts';
import { agenticMode } from '#lib/stores/agentic-mode.svelte.ts';
import { permissionsStore } from '#lib/stores/permissions.svelte.ts';
import { settingsStore } from '#lib/stores/settings/index.svelte.ts';
import type { MCPServerSettingsEntry } from '#lib/types/index.ts';

const SERVERS: MCPServerSettingsEntry[] = [
	{ enabled: true, id: 'srv-billing', name: 'Billing', url: 'https://billing.example.com/mcp' },
	{ enabled: true, id: 'srv-support', name: 'Support', url: 'https://support.example.com/mcp' },
	{ enabled: true, id: 'srv-plain', name: 'Plain', url: 'https://plain.example.com/mcp' }
];
const SKILL_URI = 'skill://refunds/SKILL.md';

function skill(description: string, resources: Skill['resources']): Skill {
	return { frontmatter: { description, name: 'refunds' }, resources, uri: SKILL_URI };
}

const FILES = [
	{ digest: `sha256:${'a'.repeat(64)}`, size: 120, uri: SKILL_URI },
	{ digest: `sha256:${'b'.repeat(64)}`, size: 40, uri: 'skill://refunds/references/guide.md' }
];
const LISTINGS: Record<string, Skill[]> = {
	'srv-billing': [skill('Refunds, by\n  billing', FILES)],
	'srv-support': [
		skill('Refunds, by support', FILES),
		{ ...skill('Made on demand', 'dynamic'), uri: 'skill://daily/SKILL.md' }
	]
};

function provider(): ToolProvider {
	let made: ToolProvider | undefined;

	const ctx: ExtensionContext = {
		contribute: (point, contribution) => {
			if (point === 'tools') made = contribution as ToolProvider;
		},
		onDeactivate: () => {}
	};

	contributeTools(ctx);

	return made!;
}

function call(name: McpSkillTool, args: Record<string, string> = {}) {
	return { arguments: JSON.stringify(args), id: 'call-1', name };
}

beforeEach(() => {
	// as against a llama-server started with --agent, with Enable MCP on
	agenticMode.serverHasTools = true;
	settingsStore.updateConfig(SETTINGS_KEYS.ENABLE_MCP, true);
	vi.restoreAllMocks();
	vi.spyOn(mcpStore, 'getServers').mockReturnValue(SERVERS);
	vi.spyOn(mcpStore, 'getConnections').mockReturnValue(new Map());
	vi.spyOn(mcpStore, 'publishesSkills').mockImplementation((serverId) => serverId in LISTINGS);
	vi.spyOn(mcpStore.skills, 'list').mockImplementation(async (serverId) => LISTINGS[serverId]);
});

describe('skill tools', () => {
	it('are not on offer while no server in use publishes skills', () => {
		vi.spyOn(mcpStore, 'publishesSkills').mockReturnValue(false);

		expect(provider().entries()).toEqual([]);
	});

	it('are one group of two tools, and only the load asks for what it loads', () => {
		const [list, load] = provider().entries();

		expect(list).toMatchObject({ groupId: MCP_SKILLS_TOOL_GROUP_ID });
		expect(list.definition.function.name).toBe(McpSkillTool.LIST);
		expect(list.callPermission).toBeUndefined();
		expect(load).toMatchObject({ groupId: MCP_SKILLS_TOOL_GROUP_ID });
		expect(load.definition.function.name).toBe(McpSkillTool.LOAD);
		expect(load.callPermission).toBeTypeOf('function');
	});

	describe('permission of a load', () => {
		const [refunds] = LISTINGS['srv-support'];

		function gates() {
			const made = provider();

			vi.spyOn(extensions, 'contributions').mockImplementation(((point: string) =>
				point === 'tools' ? [made] : []) as typeof extensions.contributions);

			return new AgenticGates();
		}

		function permissionFor(isAllowed: boolean, hasChanged = false) {
			return vi
				.spyOn(mcpStore.skills, 'permissionFor')
				.mockResolvedValue({ hasChanged, isAllowed, skill: refunds });
		}

		it('asks for the skill and its server, not for the tool', async () => {
			const lookup = permissionFor(false, true);
			const asked = gates();
			const decision = asked.requestPermission(
				'conv-1',
				call(McpSkillTool.LOAD, { server: 'Support', uri: SKILL_URI }),
				'MCP Skills'
			);

			await vi.waitFor(() => expect(asked.getPendingPermissionRequest('conv-1')).not.toBeNull());

			const pending = asked.getPendingPermissionRequest('conv-1')!;

			expect(lookup).toHaveBeenCalledWith('srv-support', SKILL_URI);
			expect(pending).toMatchObject({
				permission: { alwaysLabel: 'Always allow this skill', subject: 'the skill refunds' },
				serverLabel: 'Support',
				toolName: McpSkillTool.LOAD
			});
			expect(pending.permission?.detail?.props).toEqual({
				hasChanged: true,
				serverId: 'srv-support',
				skill: refunds
			});

			asked.resolvePermission('conv-1', ToolPermissionDecision.DENY);
			await expect(decision).resolves.toBe(ToolPermissionDecision.DENY);
		});

		it.each([
			[ToolPermissionDecision.ONCE, false],
			[ToolPermissionDecision.ALWAYS, true]
		])('keeps the answer %s with the skills, never with the tool', async (answer, always) => {
			const allow = vi.spyOn(mcpStore.skills, 'allow').mockImplementation(() => {});
			const allowTool = vi.spyOn(permissionsStore, 'allowTool');

			permissionFor(false);

			const asked = gates();
			const decision = asked.requestPermission(
				'conv-1',
				call(McpSkillTool.LOAD, { server: 'Support', uri: SKILL_URI }),
				'MCP Skills'
			);

			await vi.waitFor(() => expect(asked.getPendingPermissionRequest('conv-1')).not.toBeNull());
			asked.resolvePermission('conv-1', answer);

			await expect(decision).resolves.toBe(answer);
			expect(allow).toHaveBeenCalledWith('srv-support', refunds, always);
			expect(allowTool).not.toHaveBeenCalled();
		});

		it('does not ask for a skill the user allowed', async () => {
			permissionFor(true);

			await expect(
				gates().requestPermission(
					'conv-1',
					call(McpSkillTool.LOAD, { server: 'Support', uri: SKILL_URI }),
					'MCP Skills'
				)
			).resolves.toBe(ToolPermissionDecision.ONCE);
		});

		it('asks nothing for a call that names no skill: the call fails saying why', async () => {
			const lookup = vi.spyOn(mcpStore.skills, 'permissionFor');
			const asked = gates();

			await expect(
				asked.requestPermission('conv-1', call(McpSkillTool.LOAD, { server: 'Plain' }), '')
			).resolves.toBe(ToolPermissionDecision.ONCE);
			expect(lookup).not.toHaveBeenCalled();
			await expect(
				provider().execute(call(McpSkillTool.LOAD, { server: 'Plain' }))
			).rejects.toThrow('"uri" is missing');
		});

		it('refuses a load the user did not allow, whoever let the call through', async () => {
			await expect(
				provider().execute(call(McpSkillTool.LOAD, { server: 'Support', uri: SKILL_URI }))
			).rejects.toThrow('has not allowed the skill "refunds"');
		});
	});

	it('list every server skills under its name, a same-named skill once per server', async () => {
		const { content } = await provider().execute(call(McpSkillTool.LIST));

		expect(content).toContain(
			['Server: Billing', `- refunds (${SKILL_URI}): Refunds, by billing`].join('\n')
		);
		expect(content).toContain(
			['Server: Support', `- refunds (${SKILL_URI}): Refunds, by support`].join('\n')
		);
		// a server without skills is not asked, a skill that cannot be verified is not offered
		expect(content).not.toContain('Plain');
		expect(content).not.toContain('Made on demand');
	});

	it('leave a call to the server that has a tool of the same name', async () => {
		const executeTool = vi
			.spyOn(mcpStore, 'executeTool')
			.mockResolvedValue({ content: 'from the server', isError: false });
		const load = vi.spyOn(mcpStore.skills, 'load');

		vi.spyOn(mcpStore, 'hasTool').mockImplementation((name) => name === McpSkillTool.LOAD);

		await expect(
			provider().execute(call(McpSkillTool.LOAD, { server: 'Support', uri: SKILL_URI }))
		).resolves.toEqual({ content: 'from the server', isError: false });
		expect(executeTool).toHaveBeenCalledTimes(1);
		expect(load).not.toHaveBeenCalled();
	});

	it('say which server could not list, and still list the others', async () => {
		vi.spyOn(mcpStore.skills, 'list').mockImplementation(async (serverId) => {
			if (serverId === 'srv-billing') throw new Error('server is down');

			return LISTINGS[serverId];
		});

		const { content } = await provider().execute(call(McpSkillTool.LIST));

		expect(content).toContain('Server: Billing\n(its skills could not be listed: server is down)');
		expect(content).toContain('Refunds, by support');
	});

	it('load a skill from the server the model names, under a line that names it', async () => {
		const [loaded] = LISTINGS['srv-support'];
		const load = vi.spyOn(mcpStore.skills, 'load').mockResolvedValue({
			file: {
				body: '# Refunds\n\nAsk for the order number.\n',
				bytes: new Uint8Array(),
				text: '---\nname: refunds\nallowed-tools: Bash\n---\n# Refunds\n',
				uri: SKILL_URI,
				verified: true
			} as SkillFile,
			skill: loaded
		});
		const { content } = await provider().execute(
			call(McpSkillTool.LOAD, { server: 'Support', uri: SKILL_URI })
		);

		expect(load).toHaveBeenCalledWith('srv-support', SKILL_URI, undefined);
		expect(content).toMatch(/^Skill "refunds" from the MCP server "Support"/);
		expect(content).toContain('written by that server, not by the user');
		expect(content).toContain('Ask for the order number.');
		// the frontmatter stays out: nothing in it changes what the model may do
		expect(content).not.toContain('allowed-tools');
		expect(content).toContain('- references/guide.md');
	});

	it('load one of the other files of a skill', async () => {
		const load = vi.spyOn(mcpStore.skills, 'load').mockResolvedValue({
			file: {
				bytes: new Uint8Array(),
				text: 'The guide.',
				uri: 'skill://refunds/references/guide.md',
				verified: true
			} as SkillFile,
			skill: LISTINGS['srv-billing'][0]
		});
		const { content } = await provider().execute(
			call(McpSkillTool.LOAD, {
				file: 'references/guide.md',
				server: 'srv-billing',
				uri: SKILL_URI
			})
		);

		expect(load).toHaveBeenCalledWith('srv-billing', SKILL_URI, 'references/guide.md');
		expect(content).toContain('from the MCP server "Billing"');
		expect(content).toContain('The guide.');
		expect(content).not.toContain('Other files');
	});

	it('refuse a server that publishes no skills here, and never pick another one', async () => {
		const load = vi.spyOn(mcpStore.skills, 'load');

		await expect(
			provider().execute(call(McpSkillTool.LOAD, { server: 'Plain', uri: SKILL_URI }))
		).rejects.toThrow('Servers with skills: "Billing", "Support".');
		await expect(
			provider().execute(call(McpSkillTool.LOAD, { server: 'Billing' }))
		).rejects.toThrow('"uri" is missing');
		expect(load).not.toHaveBeenCalled();
	});
});
