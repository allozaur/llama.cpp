import type { ExtensionManifest } from './types';
import { AGENTIC_ENABLED } from '#lib/constants/app.constants.ts';
import { agenticMode } from '#lib/stores/agentic-mode.svelte.ts';

/**
 * The extensions this build of Llama Chat is composed with. Each `load` is a
 * dynamic import, so nothing of an extension runs until the registry
 * activates it. llama-server embeds the app as a single bundle, so there the
 * code ships either way; a build that splits chunks fetches it on demand.
 * A chat-only build (VITE_PUBLIC_AGENTIC=false) has no tools, so it is
 * composed without MCP, and a full build leaves MCP's contributions out
 * until llama-server offers the agentic features.
 */
export const BUILT_IN_EXTENSIONS: ExtensionManifest[] = AGENTIC_ENABLED
	? [
			{
				available: () =>
					agenticMode.enabled || agenticMode.settled ? agenticMode.enabled : undefined,
				description: 'Connect MCP servers and use their tools, prompts and resources in chats.',
				id: 'mcp',
				load: () => import('./mcp'),
				name: 'MCP'
			}
		]
	: [];
