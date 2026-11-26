/**
 * MCP servers as a source of skills: the skills they publish are listed in the
 * Library with the ones found on the machine, each under its server's name,
 * and a chat attaches and loads them as it does the machine's. A load is
 * verified against the server's digests (see `stores/skills.svelte.ts`).
 */

import type { SkillEntry, SkillPermission } from '../../points/skills';
import { toolCallPermissionDetail } from '../../points/tools';
import type { ExtensionContext } from '../../types';
import McpLogo from '../components/McpLogo.svelte';
import { attachSkill } from '../composer-skills';
import { mcpStore } from '../stores/index.svelte';
import { skillServersInUse } from '../tools';
import { MCP_SKILL_DYNAMIC_RESOURCES, MCP_SKILLS_ORIGIN_KIND } from './constants';
import { formatSkillFile } from './format';
import type { Skill } from '@modelcontextprotocol/client/ext/skills';
import { BuiltInTool, SkillToolArgument } from '#lib/enums/index.ts';

const MCP_SKILLS_SOURCE_ID = 'mcp';
/** Between the server id and the URI in an entry's id: a URI alone does not say which skill. */
const ENTRY_ID_SEPARATOR = ' ';
/** Said with the other files of a loaded skill. */
const LOAD_FILE_HINT = `load one with ${BuiltInTool.BROWSER_LOAD_SKILL} and "${SkillToolArgument.FILE}"`;

/** A listed skill with the server it is from. */
interface ListedSkill {
	serverId: string;
	skill: Skill;
}

export function contributeSkillSource(ctx: ExtensionContext): void {
	// the skills behind the entries handed out, by entry id
	let listed: Record<string, ListedSkill> = {};

	function listedSkill(entry: SkillEntry): ListedSkill {
		const item = listed[entry.id];

		if (!item) throw new Error(`The skill "${entry.name}" is no longer listed`);

		return item;
	}

	ctx.contribute('skillSources', {
		// picking it is the user's yes, for as long as the page is open
		async attach(entry): Promise<void> {
			const { serverId, skill } = listedSkill(entry);

			await attachSkill(serverId, skill);
		},
		icon: McpLogo,
		id: MCP_SKILLS_SOURCE_ID,
		isAvailable: () => skillServersInUse().length > 0,

		async list(): Promise<SkillEntry[]> {
			listed = {};

			if (!(await mcpStore.ensureInitialized())) return [];

			// in the order of the servers; a server that fails to list leaves the others' skills
			const serverIds = skillServersInUse();
			const listings = await Promise.allSettled(
				serverIds.map((serverId) => mcpStore.skills.list(serverId))
			);

			return listings.flatMap((listing, index) => {
				if (listing.status === 'rejected') return [];

				const serverId = serverIds[index];
				const iconUrl = mcpStore.getServerFavicon(serverId) ?? undefined;

				return listing.value.map((skill): SkillEntry => {
					const id = `${serverId}${ENTRY_ID_SEPARATOR}${skill.uri}`;

					listed[id] = { serverId, skill };

					return {
						description: skill.frontmatter.description,
						iconUrl,
						id,
						isUnverified: skill.resources === MCP_SKILL_DYNAMIC_RESOURCES,
						name: skill.frontmatter.name,
						origin: mcpStore.getServerDisplayName(serverId)
					};
				});
			});
		},

		async load(entry, file): Promise<string> {
			const item = listedSkill(entry);
			const loaded = await mcpStore.skills.load(item.serverId, item.skill.uri, file);

			return formatSkillFile(
				loaded.skill,
				loaded.file,
				mcpStore.getServerDisplayName(item.serverId),
				LOAD_FILE_HINT
			);
		},
		originKind: MCP_SKILLS_ORIGIN_KIND,

		async permission(entry): Promise<SkillPermission> {
			const item = listedSkill(entry);
			const { hasChanged, isAllowed, skill } = await mcpStore.skills.permissionFor(
				item.serverId,
				item.skill.uri
			);
			// drawn only when a load asks
			const { default: McpSkillPermissionDetail } =
				await import('../components/skills/McpSkillPermissionDetail.svelte');

			return {
				allow: (always) => mcpStore.skills.allow(item.serverId, skill, always),
				detail: toolCallPermissionDetail(McpSkillPermissionDetail, {
					hasChanged,
					serverId: item.serverId,
					skill
				}),
				hasChanged,
				isAllowed
			};
		},

		// a verified read, as the server card's Read SKILL.md does: looking at a skill is not loading it
		async read(entry): Promise<string> {
			const { serverId, skill } = listedSkill(entry);

			return (await mcpStore.skills.read(serverId, skill)).text ?? '';
		}
	});
}
