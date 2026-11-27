// The machine's skills folders are one source of skills, listed before the ones
// extensions add: read only when llama-server offers its file tools, one skill per
// name, the first folder's when two folders hold the same name.

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('#lib/services/local-skills.service.ts', () => ({
	LocalSkillsService: { list: vi.fn(), read: vi.fn() }
}));

const offeredTools = vi.hoisted(() => ({ names: [] as string[] }));

vi.mock('#lib/stores/tools.svelte.ts', () => ({
	toolsStore: {
		get serverTools() {
			return offeredTools.names.map((name) => ({ function: { name } }));
		}
	}
}));

import { LOCAL_SKILL_FOLDERS, LOCAL_SKILLS_SOURCE_ID } from '#lib/constants/index.ts';
import { BuiltInTool } from '#lib/enums/index.ts';
import { type LocalSkill, LocalSkillsService } from '#lib/services/local-skills.service.ts';
import { skillsStore } from '#lib/stores/skills.svelte.ts';

const list = vi.mocked(LocalSkillsService.list);
const read = vi.mocked(LocalSkillsService.read);
const [AGENTS, CLAUDE] = LOCAL_SKILL_FOLDERS;

function skill(name: string, folder: string, description = `${name} of ${folder}`): LocalSkill {
	return { description, folder, name, path: `${folder}/${name}/SKILL.md` };
}

describe('skillsStore', () => {
	const [local] = skillsStore.sources;

	beforeEach(() => {
		vi.clearAllMocks();
		offeredTools.names = [BuiltInTool.SERVER_FILE_GLOB_SEARCH, BuiltInTool.SERVER_READ_FILE];
		list.mockImplementation(async (folder) =>
			folder === AGENTS
				? [skill('write-swift', AGENTS), skill('animate', AGENTS)]
				: [skill('animate', CLAUDE), skill('prototype', CLAUDE)]
		);
	});

	it('lists the folders of the machine first, by name, each skill under its folder', async () => {
		expect(local.id).toBe(LOCAL_SKILLS_SOURCE_ID);
		expect(await local.list()).toEqual([
			// in both folders: the first folder's
			{ description: `animate of ${AGENTS}`, id: 'animate', name: 'animate', origin: AGENTS },
			{ description: `prototype of ${CLAUDE}`, id: 'prototype', name: 'prototype', origin: CLAUDE },
			{
				description: `write-swift of ${AGENTS}`,
				id: 'write-swift',
				name: 'write-swift',
				origin: AGENTS
			}
		]);
		expect(list.mock.calls.map(([folder]) => folder)).toEqual([...LOCAL_SKILL_FOLDERS]);
	});

	it('lists nothing, and asks for nothing, when llama-server offers no file tools', async () => {
		offeredTools.names = [BuiltInTool.SERVER_READ_FILE];

		expect(skillsStore.canReadLocalSkills).toBe(false);
		expect(await local.list()).toEqual([]);
		expect(list).not.toHaveBeenCalled();
	});

	it('keeps the skills of the other folders when one cannot be listed', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		list.mockImplementation(async (folder) => {
			if (folder === AGENTS) throw new Error('llama-server is not reachable');

			return [skill('prototype', CLAUDE)];
		});

		expect((await local.list()).map((entry) => entry.name)).toEqual(['prototype']);
	});

	it('reads the SKILL.md of a listed skill from the folder it was listed from', async () => {
		read.mockResolvedValue('# Animations');

		const [animate] = await local.list();

		expect(await local.read(animate)).toBe('# Animations');
		expect(read).toHaveBeenCalledWith(skill('animate', AGENTS));
	});

	it('refuses to read a skill it did not list', async () => {
		await local.list();

		await expect(
			local.read({ description: '', id: 'unknown', name: 'unknown', origin: AGENTS })
		).rejects.toThrow('no longer listed');
		expect(read).not.toHaveBeenCalled();
	});
});
