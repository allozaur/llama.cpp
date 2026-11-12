/**
 * The MCP extension: everything Llama Chat does with MCP servers reaches the
 * core through what `activate` contributes here.
 */

import type { Extension } from '../types';
import { contributeTools } from './tools';

const mcp: Extension = {
	activate(ctx) {
		contributeTools(ctx);
	}
};

export default mcp;
