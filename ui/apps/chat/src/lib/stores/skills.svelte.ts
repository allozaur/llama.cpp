/**
 * skillsStore - Every source of skills
 *
 * The skills folders of the machine llama-server runs on are the app's own
 * source; `sources` lists it with the ones extensions add, such as the skills
 * MCP servers publish. Nothing is kept of the skills: a list is read when it
 * shows. What is kept is which local skills the user allowed the model to load,
 * each bound to the digest of its SKILL.md, so a skill that changed is asked
 * for again.
 */

import {
	LOCAL_SKILL_APPROVALS_LOCALSTORAGE_KEY,
	LOCAL_SKILL_FOLDERS,
	LOCAL_SKILLS_ORIGIN_KIND,
	LOCAL_SKILLS_SOURCE_ID,
	SKILL_ATTACHMENT_TITLE_PREFIX,
	SKILL_ICON,
	SKILL_MANIFEST_NAME
} from '#lib/constants/index.ts';
import { BuiltInTool, MimeTypeText } from '#lib/enums/index.ts';
import {
	extensions,
	type SkillEntry,
	type SkillPermission,
	type SkillSource,
	toolCallPermissionDetail
} from '#lib/extensions/index.ts';
import { type LocalSkill, LocalSkillsService } from '#lib/services/local-skills.service.ts';
import { toolsStore } from '#lib/stores/tools.svelte.ts';
import { skillDigest, uuid } from '#lib/utils/index.ts';
import { SvelteMap } from 'svelte/reactivity';

/** What reading the skills folders takes of llama-server. */
const LOCAL_SKILL_TOOLS: readonly string[] = [
	BuiltInTool.SERVER_FILE_GLOB_SEARCH,
	BuiltInTool.SERVER_READ_FILE
];

/** The path of a skill's SKILL.md, then the digest the user allowed it with. */
type LocalSkillApprovals = Record<string, string>;

function loadApprovals(): LocalSkillApprovals {
	try {
		const stored = localStorage.getItem(LOCAL_SKILL_APPROVALS_LOCALSTORAGE_KEY);
		const records: unknown = stored ? JSON.parse(stored) : null;

		return typeof records === 'object' && records !== null && !Array.isArray(records)
			? (records as LocalSkillApprovals)
			: {};
	} catch {
		return {};
	}
}

/** A load of a local skill the user did not allow, or not with the text it has now. */
export class LocalSkillNotAllowedError extends Error {
	constructor(skill: Pick<LocalSkill, 'name'>) {
		super(`The user has not allowed the skill "${skill.name}".`);
	}
}

class SkillsStore {
	// allowed for now: bound to a digest like an approval, and gone with the page
	private allowedForNow = new SvelteMap<string, string>();
	// read on first use: nothing touches the storage before a skill is loaded
	private approvalRecords: LocalSkillApprovals | undefined;
	// the skills behind the entries handed out, by entry id
	private listed = new Map<string, LocalSkill>();

	/** The machine's skills folders as a source of skills, the first of `sources`. */
	private readonly localSource: SkillSource = {
		attach: (entry, composer) => this.attachLocal(entry, composer),
		icon: SKILL_ICON,
		id: LOCAL_SKILLS_SOURCE_ID,
		isAvailable: () => this.canReadLocalSkills,
		list: () => this.listLocal(),
		load: (entry, file) => this.loadLocal(entry, file),
		originKind: LOCAL_SKILLS_ORIGIN_KIND,
		permission: (entry) => this.localPermission(entry),
		read: async (entry) => LocalSkillsService.read(this.listedSkill(entry))
	};

	private get approvals(): LocalSkillApprovals {
		return (this.approvalRecords ??= loadApprovals());
	}

	/**
	 * Whether the skills folders can be read: llama-server has to offer its file
	 * tools, which it does when it is started with tools on.
	 */
	get canReadLocalSkills(): boolean {
		const offered = toolsStore.serverTools.map((tool) => tool.function.name);

		return LOCAL_SKILL_TOOLS.every((tool) => offered.includes(tool));
	}

	/** Whether any source offers skills to a chat now: `/skill` and the skill tools go with it. */
	get hasAvailableSources(): boolean {
		return this.sources.some((source) => source.isAvailable());
	}

	/** Where skills come from: the machine's folders, then what extensions add, such as MCP servers. */
	get sources(): SkillSource[] {
		return [this.localSource, ...extensions.contributions('skillSources')];
	}

	private allowLocal(skill: LocalSkill, digest: string, always: boolean): void {
		if (!always) {
			this.allowedForNow.set(skill.path, digest);

			return;
		}

		this.approvalRecords = { ...this.approvals, [skill.path]: digest };

		try {
			localStorage.setItem(LOCAL_SKILL_APPROVALS_LOCALSTORAGE_KEY, JSON.stringify(this.approvals));
		} catch (error) {
			console.error('Failed to save the approved skills:', error);
		}
	}

	/** A chip that shows while the SKILL.md is read, then holds the skill as the model gets it. */
	private async attachLocal(
		entry: SkillEntry,
		composer: Parameters<SkillSource['attach']>[1]
	): Promise<void> {
		const name = `${SKILL_ATTACHMENT_TITLE_PREFIX}${entry.name}`;
		const id = uuid();

		composer.addUploadedFile({
			file: new File([], name, { type: MimeTypeText.MARKDOWN }),
			id,
			isLoading: true,
			name,
			size: 0,
			type: MimeTypeText.MARKDOWN
		});
		composer.focusInput();

		try {
			const skill = this.listedSkill(entry);
			const text = await LocalSkillsService.read(skill);

			// picking it is the user's yes, for the text it has now and while the page is open
			this.allowLocal(skill, await skillDigest(text), false);

			const content = LocalSkillsService.format(skill, text);

			composer.updateUploadedFile(id, (file) => ({
				...file,
				file: new File([content], name, { type: MimeTypeText.MARKDOWN }),
				isLoading: false,
				size: content.length,
				textContent: content
			}));
		} catch (error) {
			const loadError = error instanceof Error ? error.message : String(error);

			composer.updateUploadedFile(id, (file) => ({ ...file, isLoading: false, loadError }));
		}
	}

	private isAllowed(skill: LocalSkill, digest: string): boolean {
		return this.approvals[skill.path] === digest || this.allowedForNow.get(skill.path) === digest;
	}

	/** The skill behind an entry this source handed out. */
	private listedSkill(entry: SkillEntry): LocalSkill {
		const skill = this.listed.get(entry.id);

		if (!skill) throw new Error(`The skill "${entry.name}" is no longer listed`);

		return skill;
	}

	private async listLocal(): Promise<SkillEntry[]> {
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
	}

	/**
	 * Load a skill for the model: only its SKILL.md, and only with the text the
	 * user allowed. Its other files are not offered: an approval covers SKILL.md.
	 */
	private async loadLocal(entry: SkillEntry, file?: string): Promise<string> {
		const skill = this.listedSkill(entry);

		if (file && file !== SKILL_MANIFEST_NAME) {
			throw new Error(
				`Only the ${SKILL_MANIFEST_NAME} of a skill from a folder can be loaded, not "${file}".`
			);
		}

		const text = await LocalSkillsService.read(skill);

		if (!this.isAllowed(skill, await skillDigest(text))) throw new LocalSkillNotAllowedError(skill);

		return LocalSkillsService.format(skill, text);
	}

	/** What loading a skill takes from the user: nothing when they allowed it with the text it has now. */
	private async localPermission(entry: SkillEntry): Promise<SkillPermission> {
		const skill = this.listedSkill(entry);
		const digest = await skillDigest(await LocalSkillsService.read(skill));
		const approved = this.approvals[skill.path];
		const hasChanged = approved !== undefined && approved !== digest;
		// drawn only when a load asks
		const { default: SkillPermissionDetail } =
			await import('#lib/components/app/chat/ChatMessages/ChatMessageActions/ChatMessageActionCard/ChatMessageActionCardSkillDetail.svelte');

		return {
			allow: (always) => this.allowLocal(skill, digest, always),
			detail: toolCallPermissionDetail(SkillPermissionDetail, {
				description: skill.description,
				hasChanged,
				path: skill.path
			}),
			hasChanged,
			isAllowed: this.isAllowed(skill, digest)
		};
	}
}

export const skillsStore = new SkillsStore();
