/**
 * The MCP extension: everything Llama Chat does with MCP servers reaches the
 * core through what `activate` contributes here.
 */

import type { Extension } from '../types';
import { contributeComposer } from './composer';
import { contributeRenderers } from './renderers';
import { contributeSettings } from './settings';
import { contributeStartup } from './startup.svelte';
import { contributeTools } from './tools';

const mcp: Extension = {
	activate(ctx) {
		contributeComposer(ctx);
		contributeRenderers(ctx);
		contributeSettings(ctx);
		contributeStartup(ctx);
		contributeTools(ctx);
	}
};

export default mcp;
