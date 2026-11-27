import { STORAGE_APP_NAME } from './storage.constants';

/** The file that names, describes and holds a skill. */
export const SKILL_MANIFEST_NAME = 'SKILL.md';

/**
 * The folders skills are looked for in, on the machine llama-server runs on, in
 * order: when two hold a skill of the same name, the first one's is listed.
 * `.agents/skills` is the shared folder of agents, `.claude/skills` the one
 * Claude Code reads.
 */
export const LOCAL_SKILL_FOLDERS = ['~/.agents/skills', '~/.claude/skills'] as const;

/** Every SKILL.md of a skills folder: a skill is a folder in it, with that file. */
export const LOCAL_SKILLS_GLOB = `**/${SKILL_MANIFEST_NAME}`;

/** A skills folder, a skill's own folder, its SKILL.md. */
export const LOCAL_SKILLS_MAX_DEPTH = 2;

/** Skills listed from one folder at most. */
export const LOCAL_SKILLS_LIMIT = 200;

/** Lines of a SKILL.md read for the list: enough to hold its frontmatter. */
export const LOCAL_SKILL_FRONTMATTER_LINES = 40;

/** Id of the machine's folders as a source of skills. */
export const LOCAL_SKILLS_SOURCE_ID = 'local';

/** What one of the local source's origins is, in the model's listing of skills. */
export const LOCAL_SKILLS_ORIGIN_KIND = 'folder';

/** Where the local skills the user always allows are remembered, in localStorage. */
export const LOCAL_SKILL_APPROVALS_LOCALSTORAGE_KEY = `${STORAGE_APP_NAME}.localSkillApprovals`;

/** Id of the chat form's skill picker, which `/skill` opens. */
export const SKILLS_PICKER_ID = 'skills';

/** A skill list this long gets a search field. */
export const SKILL_SEARCH_MIN_ITEMS = 4;

/** What the chip of a skill attached to a message reads, before the skill's name. */
export const SKILL_ATTACHMENT_TITLE_PREFIX = 'Skill: ';
