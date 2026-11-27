/**
 * A skill picked in the chat form. Its SKILL.md is a resource of its server,
 * so it waits with the MCP resources of the next message: a chip that shows
 * while the file is read, then holds the text. Picking a skill is the user's
 * yes to it, for as long as the page is open.
 */

import { formatSkillFile } from './skills/format';
import { mcpStore } from './stores/index.svelte';
import type { Skill } from '@modelcontextprotocol/client/ext/skills';
import { MimeTypeText } from '#lib/enums/index.ts';
import { toast } from 'svelte-sonner';

/** What the chip of a picked skill reads. */
export function skillAttachmentTitle(skill: Skill): string {
	return `Skill: ${skill.frontmatter.name}`;
}

/** Attach a skill of a server to the next message. A skill that cannot be loaded leaves no chip. */
export async function attachSkill(serverId: string, picked: Skill): Promise<void> {
	const attachment = mcpStore.resources.addAttachment({
		description: picked.frontmatter.description,
		mimeType: MimeTypeText.MARKDOWN,
		name: picked.frontmatter.name,
		serverName: serverId,
		title: skillAttachmentTitle(picked),
		uri: picked.uri
	});

	try {
		mcpStore.skills.allow(serverId, picked, false);

		const { file, skill } = await mcpStore.skills.load(serverId, picked.uri);

		mcpStore.resources.updateAttachmentContent(attachment.id, [
			{
				mimeType: MimeTypeText.MARKDOWN,
				text: formatSkillFile(skill, file, mcpStore.getServerDisplayName(serverId)),
				uri: file.uri
			}
		]);
	} catch (error) {
		mcpStore.resources.removeAttachment(attachment.id);
		toast.error(error instanceof Error ? error.message : String(error));
	}
}
