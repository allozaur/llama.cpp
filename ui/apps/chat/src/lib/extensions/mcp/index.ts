/**
 * The MCP extension: everything Llama Chat does with MCP servers reaches the
 * core through what `activate` contributes here.
 */

import type { Extension } from '../types';
import { contributeNavigation } from './navigation';
import { contributePages } from './pages';
import { contributeStartup } from './startup.svelte';
import { contributeTools } from './tools';

const mcp: Extension = {
	activate(ctx) {
		contributeNavigation(ctx);
		contributePages(ctx);
		contributeStartup(ctx);
		contributeTools(ctx);
	}
};

export default mcp;
