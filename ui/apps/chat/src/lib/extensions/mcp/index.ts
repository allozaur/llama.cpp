/**
 * The MCP extension: everything Llama Chat does with MCP servers reaches the
 * core through what `activate` contributes here.
 *
 * All of MCP's code is in this folder: `services/` (MCPService, the protocol
 * layer), `stores/` (mcpStore, the host role), `components/`, and the glue
 * files beside this one, one per group of extension points. The core does
 * not import any of it.
 */

import type { Extension } from '../types';
import { contributeComposer } from './composer';
import { contributeNavigation } from './navigation';
import { contributePages } from './pages';
import { contributeRenderers } from './renderers';
import { contributeStartup } from './startup.svelte';
import { contributeSystemPrompts } from './system-prompts';
import { contributeTools } from './tools';

const mcp: Extension = {
	activate(ctx) {
		contributeComposer(ctx);
		contributeNavigation(ctx);
		contributePages(ctx);
		contributeRenderers(ctx);
		contributeStartup(ctx);
		contributeSystemPrompts(ctx);
		contributeTools(ctx);
	}
};

export default mcp;
