/**
 * The MCP SDK's Skills extension (SEP-2640), as one module MCPService loads
 * on demand: only a server that publishes skills needs it, so it stays out
 * of the SDK's chunk too.
 */

export { SkillsClient, SkillVerificationError } from '@modelcontextprotocol/client/ext/skills';
