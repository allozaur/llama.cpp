/** What the MCP extension needs to name for the skills MCP servers publish (SEP-2640). */

import type { SKILLS_EXTENSION_ID } from '@modelcontextprotocol/client/ext/skills';
import { STORAGE_APP_NAME } from '#lib/constants/storage.constants.ts';

/**
 * The key a server declares the Skills extension under, in its capabilities. Typed by the
 * SDK's own constant, so reading a capability does not load the SDK's skills module.
 */
export const MCP_SKILLS_EXTENSION_ID: typeof SKILLS_EXTENSION_ID = 'io.modelcontextprotocol/skills';

/** How long a listing is kept when the server gives no `ttlMs` (older protocol versions). */
export const MCP_SKILLS_DEFAULT_TTL_MS = 5 * 60 * 1000;

/** `resources` of a skill whose files are generated on demand: no digests, nothing to verify. */
export const MCP_SKILL_DYNAMIC_RESOURCES = 'dynamic';

/** The file every skill has, and the end of every skill URI. */
export const MCP_SKILL_MANIFEST_NAME = 'SKILL.md';

/** Where the approved skills are remembered, in localStorage. */
export const MCP_SKILL_APPROVALS_LOCALSTORAGE_KEY = `${STORAGE_APP_NAME}.mcpSkillApprovals`;

/** What one of the source's origins is, in the model's listing of skills. */
export const MCP_SKILLS_ORIGIN_KIND = 'MCP server';
