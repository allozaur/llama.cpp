// MCP servers are a source of skills through the skillSources extension point: the
// skills they publish are listed with their server, and one's SKILL.md is read
// verified, without loading it for the model.

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('#lib/extensions/mcp/stores/index.svelte.ts', () => ({
	mcpStore: {
		ensureInitialized: vi.fn(),
		getServerDisplayName: vi.fn(),
		skills: { list: vi.fn(), read: vi.fn() }
	}
}));
vi.mock('#lib/extensions/mcp/tools.ts', () => ({ skillServersInUse: vi.fn() }));
vi.mock('#lib/extensions/mcp/components/McpLogo.svelte', () => ({ default: () => {} }));

import type { Skill } from '@modelcontextprotocol/client/ext/skills';
import type { ExtensionContext, SkillSource } from '#lib/extensions/index.ts';
import { contributeSkillSource } from '#lib/extensions/mcp/skills/source.ts';
import { mcpStore } from '#lib/extensions/mcp/stores/index.svelte.ts';
import { skillServersInUse } from '#lib/extensions/mcp/tools.ts';

function skill(name: string, uri: string): Skill {
	return { frontmatter: { description: `What ${name} is for`, name }, resources: [], uri } as Skill;
}

const HF_MEM = skill('hf-mem', 'skill://hf-mem');
const HF_CLI = skill('hf-cli', 'skill://hf-cli');
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

	it('lists the skills of the servers in use, in their order, each under its server', async () => {
		expect(await activate().list()).toEqual([
			{
				description: 'What hf-mem is for',
				id: 'hf skill://hf-mem',
				name: 'hf-mem',
				origin: 'Hugging Face'
			},
			{
				description: 'What hf-cli is for',
				id: 'hf skill://hf-cli',
				name: 'hf-cli',
				origin: 'Hugging Face'
			},
			{
				description: 'What hf-mem is for',
				id: 'docs skill://hf-mem',
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
