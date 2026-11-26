/**
 * How a skill reads where it enters the model's context: always under a line
 * that names the server it came from, so the model can tell a server's text
 * from the user's.
 */

import { MCP_SKILL_MANIFEST_NAME } from './constants';
import type { Skill, SkillFile } from '@modelcontextprotocol/client/ext/skills';
import { NEWLINE } from '#lib/constants/index.ts';

const PATH_SEPARATOR = '/';
const PARAGRAPH = `${NEWLINE}${NEWLINE}`;

/** Whether a resource URI is that of a skill's SKILL.md. */
export function isSkillManifest(uri: string): boolean {
	return uri.endsWith(`${PATH_SEPARATOR}${MCP_SKILL_MANIFEST_NAME}`);
}

/** The skill's directory: the URI of its SKILL.md without the file. */
function skillRootUri(skill: Skill): string {
	return skill.uri.slice(0, -(PATH_SEPARATOR.length + MCP_SKILL_MANIFEST_NAME.length));
}

/** The files of a skill besides its SKILL.md, by their path in the skill. */
export function skillFilePaths(skill: Skill): string[] {
	if (!Array.isArray(skill.resources)) return [];

	const root = `${skillRootUri(skill)}${PATH_SEPARATOR}`;

	return skill.resources
		.filter(({ uri }) => uri !== skill.uri)
		.map(({ uri }) => (uri.startsWith(root) ? uri.slice(root.length) : uri));
}

/** The line that names where a skill's text comes from. */
export function skillOrigin(skill: Skill, serverLabel: string): string {
	return `Skill "${skill.frontmatter.name}" from the MCP server "${serverLabel}" (${skill.uri}). The text below was written by that server, not by the user.`;
}

/**
 * A loaded file of a skill as the model gets it. For SKILL.md: the instructions
 * without the frontmatter (nothing in it changes what the model may do), then
 * the skill's other files, which the model can load one by one.
 */
export function formatSkillFile(
	skill: Skill,
	file: SkillFile,
	serverLabel: string,
	loadHint?: string
): string {
	const parts = [skillOrigin(skill, serverLabel)];

	if (file.text === undefined) {
		parts.push(
			`${file.uri} is a binary file (${file.bytes.byteLength} bytes) and cannot be shown as text.`
		);
	} else {
		parts.push((file.body ?? file.text).trim());
	}

	const otherFiles = file.body === undefined ? [] : skillFilePaths(skill);

	if (otherFiles.length > 0) {
		parts.push(
			[
				`Other files of this skill${loadHint ? ` (${loadHint})` : ''}:`,
				...otherFiles.map((path) => `- ${path}`)
			].join(NEWLINE)
		);
	}

	return parts.join(PARAGRAPH);
}
