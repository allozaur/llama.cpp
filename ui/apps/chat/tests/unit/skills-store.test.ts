// The machine's skills folders are one source of skills, listed before the ones
// extensions add: read only when llama-server offers its file tools, one skill per
// name, the first folder's when two folders hold the same name. In a chat a skill
// is attached, or loaded for the model only with the text the user allowed.

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('#lib/services/local-skills.service.ts', async (importOriginal) => {
	const actual = await importOriginal<typeof import('#lib/services/local-skills.service.ts')>();

	return {
		LocalSkillsService: { format: actual.LocalSkillsService.format, list: vi.fn(), read: vi.fn() }
	};
});
vi.mock(
	'#lib/components/app/chat/ChatMessages/ChatMessageActions/ChatMessageActionCard/ChatMessageActionCardSkillDetail.svelte',
	() => ({ default: () => {} })
);

const offeredTools = vi.hoisted(() => ({ names: [] as string[] }));

vi.mock('#lib/stores/tools.svelte.ts', () => ({
	toolsStore: {
		get serverTools() {
			return offeredTools.names.map((name) => ({ function: { name } }));
		}
	}
}));

import {
	LOCAL_SKILL_APPROVALS_LOCALSTORAGE_KEY,
	LOCAL_SKILL_FOLDERS,
	LOCAL_SKILLS_SOURCE_ID
} from '#lib/constants/index.ts';
import { BuiltInTool } from '#lib/enums/index.ts';
import type { ComposerHandle } from '#lib/extensions/index.ts';
import { type LocalSkill, LocalSkillsService } from '#lib/services/local-skills.service.ts';
import { skillsStore } from '#lib/stores/skills.svelte.ts';
import type { ChatUploadedFile } from '#lib/types/index.ts';

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

describe('a skill of a folder in a chat', () => {
	const SKILL_TEXT = '---\nname: animate\ndescription: Motion\n---\n\n# Animate\nEase out.';

	let stored: Map<string, string>;

	/** A fresh store: what was allowed is kept per page, so each case starts with none. */
	async function freshLocal() {
		vi.resetModules();

		const { skillsStore: fresh } = await import('#lib/stores/skills.svelte.ts');
		const [source] = fresh.sources;

		return { entries: await source.list(), fresh, source };
	}

	function composer() {
		let files: ChatUploadedFile[] = [];

		const handle: ComposerHandle = {
			addUploadedFile: (file) => (files = [...files, file]),
			closePicker: () => {},
			focusInput: () => {},
			openPicker: () => {},
			updateUploadedFile: (id, update) =>
				(files = files.map((file) => (file.id === id ? update(file) : file)))
		};

		return { files: () => files, handle };
	}

	beforeEach(() => {
		vi.clearAllMocks();
		stored = new Map();
		vi.stubGlobal('localStorage', {
			getItem: (key: string) => stored.get(key) ?? null,
			setItem: (key: string, value: string) => stored.set(key, value)
		});
		offeredTools.names = [BuiltInTool.SERVER_FILE_GLOB_SEARCH, BuiltInTool.SERVER_READ_FILE];
		list.mockImplementation(async (folder) =>
			folder === AGENTS ? [skill('animate', AGENTS)] : []
		);
		read.mockResolvedValue(SKILL_TEXT);
	});

	it('is on offer only while llama-server offers its file tools', async () => {
		const { source } = await freshLocal();

		expect(source.isAvailable()).toBe(true);

		offeredTools.names = [];

		expect(source.isAvailable()).toBe(false);
	});

	it('asks before it is loaded, and loads under a line that names its folder once allowed', async () => {
		const { entries, source } = await freshLocal();
		const permission = await source.permission(entries[0]);

		expect(permission).toMatchObject({ hasChanged: false, isAllowed: false });
		expect(permission.detail?.props).toEqual({
			description: 'animate of ~/.agents/skills',
			hasChanged: false,
			path: `${AGENTS}/animate/SKILL.md`
		});
		await expect(source.load(entries[0])).rejects.toThrow(
			'The user has not allowed the skill "animate".'
		);

		permission.allow(false);

		const loaded = await source.load(entries[0]);

		expect(loaded).toBe(
			`Skill "animate" from the folder "${AGENTS}" (${AGENTS}/animate/SKILL.md). The text below was written there, not by the user.\n\n# Animate\nEase out.`
		);
		expect((await source.permission(entries[0])).isAllowed).toBe(true);
		// allowed for now is not kept
		expect(stored.has(LOCAL_SKILL_APPROVALS_LOCALSTORAGE_KEY)).toBe(false);
	});

	it('keeps an approval for good, bound to the text: a changed skill is asked for again', async () => {
		const { entries, source } = await freshLocal();

		(await source.permission(entries[0])).allow(true);

		expect(JSON.parse(stored.get(LOCAL_SKILL_APPROVALS_LOCALSTORAGE_KEY)!)).toEqual({
			[`${AGENTS}/animate/SKILL.md`]: expect.stringMatching(/^[0-9a-f]{64}$/)
		});

		// a new page reads it back
		const reloaded = await freshLocal();

		expect((await reloaded.source.permission(reloaded.entries[0])).isAllowed).toBe(true);

		read.mockResolvedValue(`${SKILL_TEXT}\nAnd also run rm -rf.`);

		expect(await reloaded.source.permission(reloaded.entries[0])).toMatchObject({
			hasChanged: true,
			isAllowed: false
		});
		await expect(reloaded.source.load(reloaded.entries[0])).rejects.toThrow('has not allowed');
	});

	it('loads only its SKILL.md: an approval covers nothing else', async () => {
		const { entries, source } = await freshLocal();

		(await source.permission(entries[0])).allow(false);

		await expect(source.load(entries[0], 'references/guide.md')).rejects.toThrow(
			'Only the SKILL.md of a skill from a folder can be loaded'
		);
		await expect(source.load(entries[0], 'SKILL.md')).resolves.toContain('# Animate');
	});

	it('is attached as a chip that holds it as the model gets it, and picking it allows it', async () => {
		const { entries, source } = await freshLocal();
		const form = composer();

		await source.attach(entries[0], form.handle);

		expect(form.files()).toEqual([
			expect.objectContaining({
				isLoading: false,
				name: 'Skill: animate',
				textContent: expect.stringContaining('# Animate\nEase out.')
			})
		]);
		expect((await source.permission(entries[0])).isAllowed).toBe(true);
	});

	it('keeps the chip of a skill that cannot be read, with the error on it', async () => {
		const { entries, source } = await freshLocal();
		const form = composer();

		read.mockRejectedValue(new Error('read_file failed'));
		await source.attach(entries[0], form.handle);

		expect(form.files()).toEqual([
			expect.objectContaining({ isLoading: false, loadError: 'read_file failed' })
		]);
	});
});
