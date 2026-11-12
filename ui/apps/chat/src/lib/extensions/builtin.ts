import type { ExtensionManifest } from './types';

/**
 * The extensions this build of Llama Chat is composed with. Each `load` is a
 * dynamic import, so nothing of an extension runs until the registry
 * activates it. llama-server embeds the app as a single bundle, so there the
 * code ships either way; a build that splits chunks fetches it on demand.
 */
export const BUILT_IN_EXTENSIONS: ExtensionManifest[] = [
	{
		description: 'Connect MCP servers and use their tools, prompts and resources in chats.',
		id: 'mcp',
		load: () => import('./mcp'),
		name: 'MCP'
	}
];
