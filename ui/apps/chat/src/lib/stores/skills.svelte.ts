/**
 * skillsStore - Every source of skills
 *
 * The skills folders of the machine llama-server runs on are the app's own
 * source; `sources` lists it with the ones extensions add, such as the skills
 * MCP servers publish. Nothing is kept: a list is read when it shows.
 */

import { LOCAL_SKILL_FOLDERS, LOCAL_SKILLS_SOURCE_ID, SKILL_ICON } from '#lib/constants/index.ts';
import { BuiltInTool } from '#lib/enums/index.ts';
import { extensions, type SkillEntry, type SkillSource } from '#lib/extensions/index.ts';
import { type LocalSkill, LocalSkillsService } from '#lib/services/local-skills.service.ts';
import { toolsStore } from '#lib/stores/tools.svelte.ts';

/** What reading the skills folders takes of llama-server. */
const LOCAL_SKILL_TOOLS: readonly string[] = [
	BuiltInTool.SERVER_FILE_GLOB_SEARCH,
	BuiltInTool.SERVER_READ_FILE
];

class SkillsStore {
	// the skills behind the entries handed out, by entry id
	private listed = new Map<string, LocalSkill>();

	/** The machine's skills folders as a source of skills, the first of `sources`. */
	private readonly localSource: SkillSource = {
		icon: SKILL_ICON,
		id: LOCAL_SKILLS_SOURCE_ID,
		list: async () => {
			this.listed = new Map();

			if (!this.canReadLocalSkills) return [];

			const folders = await Promise.allSettled(
				LOCAL_SKILL_FOLDERS.map((folder) => LocalSkillsService.list(folder))
			);

			for (const folder of folders) {
				if (folder.status === 'rejected') {
					console.error('Failed to list a skills folder:', folder.reason);

					continue;
				}

				// a name found in an earlier folder is that folder's skill
				for (const skill of folder.value) {
					if (!this.listed.has(skill.name)) this.listed.set(skill.name, skill);
				}
			}

			return [...this.listed.values()]
				.sort((a, b) => a.name.localeCompare(b.name))
				.map(
					(skill): SkillEntry => ({
						description: skill.description,
						id: skill.name,
						name: skill.name,
						origin: skill.folder
					})
				);
		},
		read: async (entry) => {
			const skill = this.listed.get(entry.id);

			if (!skill) throw new Error(`The skill "${entry.name}" is no longer listed`);

			return LocalSkillsService.read(skill);
		}
	};

	/**
	 * Whether the skills folders can be read: llama-server has to offer its file
	 * tools, which it does when it is started with tools on.
	 */
	get canReadLocalSkills(): boolean {
		const offered = toolsStore.serverTools.map((tool) => tool.function.name);

		return LOCAL_SKILL_TOOLS.every((tool) => offered.includes(tool));
	}

	/** Where skills come from: the machine's folders, then what extensions add, such as MCP servers. */
	get sources(): SkillSource[] {
		return [this.localSource, ...extensions.contributions('skillSources')];
	}
}

export const skillsStore = new SkillsStore();
