/**
 * The id of an MCP prompt as a prompt source hands it out, and as a system message
 * made from the prompt keeps it: `mcp:<server id>:<prompt name>`.
 */

const MCP_PROMPT_ID_PREFIX = 'mcp:';
const MCP_PROMPT_ID_SEPARATOR = ':';

export function buildMcpPromptId(serverName: string, promptName: string): string {
	return `${MCP_PROMPT_ID_PREFIX}${serverName}${MCP_PROMPT_ID_SEPARATOR}${promptName}`;
}

export function isMcpPromptId(promptId: string): boolean {
	return promptId.startsWith(MCP_PROMPT_ID_PREFIX);
}

/**
 * The server and prompt an MCP prompt id names, or null for any other id.
 * The server id ends at the first separator; the prompt name may hold more.
 */
export function parseMcpPromptId(
	promptId: string
): { serverName: string; promptName: string } | null {
	if (!isMcpPromptId(promptId)) return null;

	const rest = promptId.slice(MCP_PROMPT_ID_PREFIX.length);
	const separator = rest.indexOf(MCP_PROMPT_ID_SEPARATOR);

	if (separator <= 0 || separator === rest.length - 1) return null;

	return { promptName: rest.slice(separator + 1), serverName: rest.slice(0, separator) };
}
