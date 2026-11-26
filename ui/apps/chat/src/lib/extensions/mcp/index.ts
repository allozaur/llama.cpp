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
import { contributePrompts } from './prompts';
import { contributeRenderers } from './renderers';
import { contributeSettings } from './settings';
import { contributeSignIn } from './sign-in';
import { contributeSkillSource } from './skills/source';
import { contributeStartup } from './startup.svelte';
import { contributeTools } from './tools';

const mcp: Extension = {
	activate(ctx) {
		contributeComposer(ctx);
		contributePrompts(ctx);
		contributeRenderers(ctx);
		contributeSettings(ctx);
		contributeSignIn(ctx);
		contributeSkillSource(ctx);
		contributeStartup(ctx);
		contributeTools(ctx);
	}
};

export default mcp;
