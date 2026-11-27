// MCP servers are a source of skills through the skillSources extension point: the
// skills they publish are listed with their server, and one's SKILL.md is read
// verified, without loading it for the model. A chat attaches one, and the core's
// skill tools ask for one and load it, through the same source.

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('#lib/extensions/mcp/stores/index.svelte.ts', () => ({
	mcpStore: {
		ensureInitialized: vi.fn(),
		getServerDisplayName: vi.fn(),
		getServerFavicon: vi.fn(),
		skills: { allow: vi.fn(), list: vi.fn(), load: vi.fn(), permissionFor: vi.fn(), read: vi.fn() }
	}
}));
vi.mock('#lib/extensions/mcp/tools.ts', () => ({ skillServersInUse: vi.fn() }));
vi.mock('#lib/extensions/mcp/components/McpLogo.svelte', () => ({ default: () => {} }));
vi.mock('#lib/extensions/mcp/components/skills/McpSkillPermissionDetail.svelte', () => ({
	default: () => {}
}));
vi.mock('#lib/extensions/mcp/composer-skills.ts', () => ({ attachSkill: vi.fn() }));

import type { Skill } from '@modelcontextprotocol/client/ext/skills';
import type { ExtensionContext, SkillSource } from '#lib/extensions/index.ts';
import { attachSkill } from '#lib/extensions/mcp/composer-skills.ts';
import { contributeSkillSource } from '#lib/extensions/mcp/skills/source.ts';
import { mcpStore } from '#lib/extensions/mcp/stores/index.svelte.ts';
import { skillServersInUse } from '#lib/extensions/mcp/tools.ts';

function skill(name: string, uri: string): Skill {
	return { frontmatter: { description: `What ${name} is for`, name }, resources: [], uri } as Skill;
}

const HF_MEM = skill('hf-mem', 'skill://hf-mem');
const HF_CLI = skill('hf-cli', 'skill://hf-cli');
// its files are made on demand: listed, but not offered to the model
const DAILY = { ...skill('daily', 'skill://daily'), resources: 'dynamic' } as Skill;
// the same URI on another server is another skill
const OTHER = skill('hf-mem', 'skill://hf-mem');

function activate(): SkillSource {
	let source: SkillSource | undefined;

	const ctx: ExtensionContext = {
		contribute: (point, contribution) => {
			if (point === 'skillSources') source = contribution as SkillSource;
		},
		onDeactivate: () => {}
	};

	contributeSkillSource(ctx);

	if (!source) throw new Error('no source contributed');

	return source;
}

describe('MCP as a source of skills', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(mcpStore.ensureInitialized).mockResolvedValue(true);
		vi.mocked(skillServersInUse).mockReturnValue(['hf', 'docs']);
		vi.mocked(mcpStore.getServerDisplayName).mockImplementation((id) =>
			id === 'hf' ? 'Hugging Face' : 'Docs'
		);
		vi.mocked(mcpStore.skills.list).mockImplementation(async (serverId) =>
			serverId === 'hf' ? [HF_MEM, HF_CLI] : [OTHER]
		);
	});

	it('is on offer while a server in use publishes skills', () => {
		const source = activate();

		expect(source.isAvailable()).toBe(true);

		vi.mocked(skillServersInUse).mockReturnValue([]);

		expect(source.isAvailable()).toBe(false);
	});

	it('marks a skill whose files are made on demand as one that cannot be verified', async () => {
		vi.mocked(mcpStore.skills.list).mockResolvedValue([DAILY]);

		expect((await activate().list()).map((entry) => entry.isUnverified)).toEqual([true, true]);
	});

	it('attaches a picked skill from its own server', async () => {
		const source = activate();
		const entries = await source.list();

		await source.attach(entries[2], {} as Parameters<SkillSource['attach']>[1]);

		expect(attachSkill).toHaveBeenCalledWith('docs', OTHER);
	});

	it('asks for a skill as its server knows it now, and keeps the answer there', async () => {
		vi.mocked(mcpStore.skills.permissionFor).mockResolvedValue({
			hasChanged: true,
			isAllowed: false,
			skill: HF_MEM
		});

		const source = activate();
		const [hfMem] = await source.list();
		const permission = await source.permission(hfMem);

		expect(mcpStore.skills.permissionFor).toHaveBeenCalledWith('hf', 'skill://hf-mem');
		expect(permission).toMatchObject({ hasChanged: true, isAllowed: false });
		expect(permission.detail?.props).toEqual({ hasChanged: true, serverId: 'hf', skill: HF_MEM });

		permission.allow(true);

		expect(mcpStore.skills.allow).toHaveBeenCalledWith('hf', HF_MEM, true);
	});

	it('loads a file of a skill from its own server, under a line that names the server', async () => {
		vi.mocked(mcpStore.skills.load).mockResolvedValue({
			file: { body: 'Measure first.', text: '---\nname: hf-mem\n---\nMeasure first.' },
			skill: HF_MEM
		} as Awaited<ReturnType<typeof mcpStore.skills.load>>);

		const source = activate();
		const entries = await source.list();
		const text = await source.load(entries[2], 'references/guide.md');

		expect(mcpStore.skills.load).toHaveBeenCalledWith(
			'docs',
			'skill://hf-mem',
			'references/guide.md'
		);
		expect(text).toContain('Skill "hf-mem" from the MCP server "Docs"');
		expect(text).toContain('Measure first.');
	});

	it('lists the skills of the servers in use, in their order, each under its server', async () => {
		expect(await activate().list()).toEqual([
			{
				description: 'What hf-mem is for',
				id: 'hf skill://hf-mem',
				isUnverified: false,
				name: 'hf-mem',
				origin: 'Hugging Face'
			},
			{
				description: 'What hf-cli is for',
				id: 'hf skill://hf-cli',
				isUnverified: false,
				name: 'hf-cli',
				origin: 'Hugging Face'
			},
			{
				description: 'What hf-mem is for',
				id: 'docs skill://hf-mem',
				isUnverified: false,
				name: 'hf-mem',
				origin: 'Docs'
			}
		]);
	});

	it('keeps the skills of the other servers when one fails to list', async () => {
		vi.mocked(mcpStore.skills.list).mockImplementation(async (serverId) => {
			if (serverId === 'hf') throw new Error('server went away');

			return [OTHER];
		});

		expect((await activate().list()).map((entry) => entry.origin)).toEqual(['Docs']);
	});

	it('lists nothing when MCP could not initialize', async () => {
		vi.mocked(mcpStore.ensureInitialized).mockResolvedValue(false);

		expect(await activate().list()).toEqual([]);
		expect(mcpStore.skills.list).not.toHaveBeenCalled();
	});

	it('reads the SKILL.md of a listed skill from its own server', async () => {
		vi.mocked(mcpStore.skills.read).mockResolvedValue({
			text: '# hf-mem',
			uri: 'skill://hf-mem/SKILL.md'
		} as Awaited<ReturnType<typeof mcpStore.skills.read>>);

		const source = activate();
		const entries = await source.list();

		expect(await source.read(entries[2])).toBe('# hf-mem');
		expect(mcpStore.skills.read).toHaveBeenCalledWith('docs', OTHER);
	});

	it('refuses to read a skill it did not list', async () => {
		const source = activate();

		await source.list();

		await expect(
			source.read({ description: '', id: 'hf skill://unknown', name: 'unknown', origin: 'HF' })
		).rejects.toThrow('no longer listed');
		expect(mcpStore.skills.read).not.toHaveBeenCalled();
	});
});
