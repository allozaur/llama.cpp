/**
 * MCP servers as a source of skills: the skills they publish are listed in the
 * Library with the ones found on the machine, each under its server's name.
 */

import type { SkillEntry } from '../../points/skills';
import type { ExtensionContext } from '../../types';
import McpLogo from '../components/McpLogo.svelte';
import { mcpStore } from '../stores/index.svelte';
import { skillServersInUse } from '../tools';
import type { Skill } from '@modelcontextprotocol/client/ext/skills';

const MCP_SKILLS_SOURCE_ID = 'mcp';
/** Between the server id and the URI in an entry's id: a URI alone does not say which skill. */
const ENTRY_ID_SEPARATOR = ' ';

export function contributeSkillSource(ctx: ExtensionContext): void {
	// the skills behind the entries handed out, by entry id
	let listed: Record<string, { serverId: string; skill: Skill }> = {};

	ctx.contribute('skillSources', {
		icon: McpLogo,
		id: MCP_SKILLS_SOURCE_ID,

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

				return listing.value.map((skill): SkillEntry => {
					const id = `${serverId}${ENTRY_ID_SEPARATOR}${skill.uri}`;

					listed[id] = { serverId, skill };

					return {
						description: skill.frontmatter.description,
						id,
						name: skill.frontmatter.name,
						origin: mcpStore.getServerDisplayName(serverId)
					};
				});
			});
		},

		// a verified read, as the server card's Read SKILL.md does: looking at a skill is not loading it
		async read(entry): Promise<string> {
			const item = listed[entry.id];

			if (!item) throw new Error(`The skill "${entry.name}" is no longer listed`);

			return (await mcpStore.skills.read(item.serverId, item.skill)).text ?? '';
		}
	});
}
