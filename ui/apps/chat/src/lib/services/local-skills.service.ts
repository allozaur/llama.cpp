/**
 * LocalSkillsService - Skills in the folders of the machine llama-server runs on
 *
 * A page cannot read a folder, so the skills are found and read through
 * llama-server's file tools (`file_glob_search`, `read_file`), which take `~`
 * for the home folder. Read-only. No state.
 */

import {
	LOCAL_SKILL_FRONTMATTER_LINES,
	LOCAL_SKILLS_GLOB,
	LOCAL_SKILLS_LIMIT,
	LOCAL_SKILLS_MAX_DEPTH,
	NEWLINE,
	PATH_SEPARATOR
} from '#lib/constants/index.ts';
import { BuiltInTool, GlobSearchType, ToolResponseField } from '#lib/enums/index.ts';
import { ToolsService } from '#lib/services/tools.service.ts';
import type { GlobEntry } from '#lib/types/index.ts';
import { joinPath, parseSkillFrontmatter, skillInstructions } from '#lib/utils/index.ts';

/** A skill found in a folder. */
export interface LocalSkill {
	description: string;
	/** The skills folder it was found in, as the app names it, e.g. `~/.agents/skills`. */
	folder: string;
	name: string;
	/** Where its SKILL.md is on the machine. */
	path: string;
}

export class LocalSkillsService {
	/**
	 * A skill as the model gets it: its instructions, without the frontmatter
	 * (nothing in it changes what the model may do), under a line that names the
	 * folder it comes from, so the model can tell its text from the user's.
	 */
	static format(skill: Pick<LocalSkill, 'folder' | 'name' | 'path'>, text: string): string {
		return [
			`Skill "${skill.name}" from the folder "${skill.folder}" (${skill.path}). The text below was written there, not by the user.`,
			skillInstructions(text)
		].join(`${NEWLINE}${NEWLINE}`);
	}

	/**
	 * The skills of one folder. A folder that is not there has none; a skill whose
	 * SKILL.md cannot be read is left out.
	 */
	static async list(folder: string): Promise<LocalSkill[]> {
		const found = await ToolsService.executeToolRaw(BuiltInTool.SERVER_FILE_GLOB_SEARCH, {
			include: LOCAL_SKILLS_GLOB,
			limit: LOCAL_SKILLS_LIMIT,
			max_depth: LOCAL_SKILLS_MAX_DEPTH,
			path: folder,
			type: GlobSearchType.FILE
		});

		if (ToolResponseField.ERROR in found) return [];

		const base = typeof found.base === 'string' ? found.base : folder;
		const manifests = Array.isArray(found.entries) ? (found.entries as GlobEntry[]) : [];
		const skills = await Promise.allSettled(
			manifests.map(async (manifest): Promise<LocalSkill> => {
				const path = joinPath(base, manifest.path);
				const frontmatter = parseSkillFrontmatter(
					await LocalSkillsService.readLines(path, LOCAL_SKILL_FRONTMATTER_LINES)
				);

				return {
					description: frontmatter.description ?? '',
					folder,
					// a SKILL.md that does not name its skill is known by its folder
					name: frontmatter.name ?? manifest.path.split(PATH_SEPARATOR)[0],
					path
				};
			})
		);

		return skills.flatMap((skill) => (skill.status === 'fulfilled' ? [skill.value] : []));
	}

	/** The whole SKILL.md of a skill. */
	static read(skill: Pick<LocalSkill, 'path'>): Promise<string> {
		return LocalSkillsService.readLines(skill.path);
	}

	private static async readLines(path: string, lines?: number): Promise<string> {
		const result = await ToolsService.executeToolRaw(BuiltInTool.SERVER_READ_FILE, {
			path,
			...(lines === undefined ? {} : { end_line: lines })
		});

		if (ToolResponseField.ERROR in result) throw new Error(String(result[ToolResponseField.ERROR]));

		return String(result[ToolResponseField.PLAIN_TEXT] ?? '');
	}
}
