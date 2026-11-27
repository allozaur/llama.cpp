// The skills of a folder are found and read through llama-server's file tools: one
// search for the SKILL.md files, then the top of each for its name and description.

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('#lib/services/tools.service.ts', () => ({
	ToolsService: { executeToolRaw: vi.fn() }
}));

import { LOCAL_SKILL_FRONTMATTER_LINES, LOCAL_SKILLS_GLOB } from '#lib/constants/index.ts';
import { BuiltInTool, GlobSearchType } from '#lib/enums/index.ts';
import { LocalSkillsService } from '#lib/services/local-skills.service.ts';
import { ToolsService } from '#lib/services/tools.service.ts';

const executeToolRaw = vi.mocked(ToolsService.executeToolRaw);
const FOLDER = '~/.agents/skills';
const BASE = '/home/me/.agents/skills';
const FILES: Record<string, string> = {
	[`${BASE}/animate/SKILL.md`]:
		'---\nname: animate\ndescription: Build an animation.\n---\n\n# Animations',
	[`${BASE}/unnamed/SKILL.md`]: '# No frontmatter here'
};

/** llama-server's file tools over a folder with the files above. */
function serveFolder(entries = Object.keys(FILES)) {
	executeToolRaw.mockImplementation(async (tool, params) => {
		if (tool === BuiltInTool.SERVER_FILE_GLOB_SEARCH) {
			return {
				base: BASE,
				entries: entries.map((path) => ({ path: path.slice(BASE.length + 1), type: 'file' }))
			};
		}

		const text = FILES[String(params.path)];

		return text === undefined ? { error: 'file not found' } : { plain_text_response: text };
	});
}

describe('LocalSkillsService', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('finds the SKILL.md files of a folder and reads the top of each', async () => {
		serveFolder();

		const skills = await LocalSkillsService.list(FOLDER);

		expect(executeToolRaw).toHaveBeenCalledWith(
			BuiltInTool.SERVER_FILE_GLOB_SEARCH,
			expect.objectContaining({
				include: LOCAL_SKILLS_GLOB,
				path: FOLDER,
				type: GlobSearchType.FILE
			})
		);
		expect(executeToolRaw).toHaveBeenCalledWith(BuiltInTool.SERVER_READ_FILE, {
			end_line: LOCAL_SKILL_FRONTMATTER_LINES,
			path: `${BASE}/animate/SKILL.md`
		});
		expect(skills).toEqual([
			{
				description: 'Build an animation.',
				folder: FOLDER,
				name: 'animate',
				path: `${BASE}/animate/SKILL.md`
			},
			// known by its folder when the SKILL.md does not name it
			{ description: '', folder: FOLDER, name: 'unnamed', path: `${BASE}/unnamed/SKILL.md` }
		]);
	});

	it('has no skills for a folder that is not there', async () => {
		executeToolRaw.mockResolvedValue({ error: 'path does not exist or is not a directory' });

		expect(await LocalSkillsService.list('~/.claude/skills')).toEqual([]);
		expect(executeToolRaw).toHaveBeenCalledOnce();
	});

	it('leaves out a skill whose SKILL.md cannot be read', async () => {
		serveFolder([...Object.keys(FILES), `${BASE}/broken/SKILL.md`]);

		const skills = await LocalSkillsService.list(FOLDER);

		expect(skills.map((skill) => skill.name)).toEqual(['animate', 'unnamed']);
	});

	it('reads the whole SKILL.md of a skill', async () => {
		serveFolder();

		const text = await LocalSkillsService.read({ path: `${BASE}/animate/SKILL.md` });

		expect(text).toContain('# Animations');
		expect(executeToolRaw).toHaveBeenLastCalledWith(BuiltInTool.SERVER_READ_FILE, {
			path: `${BASE}/animate/SKILL.md`
		});
	});

	it('says why a SKILL.md could not be read', async () => {
		serveFolder();

		await expect(LocalSkillsService.read({ path: `${BASE}/gone/SKILL.md` })).rejects.toThrow(
			'file not found'
		);
	});
});
