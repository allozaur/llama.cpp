/**
 * The MCP servers llama-server runs itself: local commands (stdio) declared in
 * the file llama-server starts with, `--mcp-servers-config`. A page cannot
 * start a process, so these are the way to use a local MCP server in Llama
 * Chat. llama-server lists their tools in `/tools` with the type `mcp` and
 * runs them on `POST /tools`; the MCP extension lists them per server, beside
 * the servers the browser connects to by URL.
 */

import { ServerToolType } from '#lib/enums/index.ts';
import { ToolsService } from '#lib/services/tools.service.ts';
// direct import of the store, not via the barrel, to avoid circular deps
import { toolsStore } from '#lib/stores/tools.svelte.ts';
import type { ServerToolInfo, ToolExecutionResult } from '#lib/types/index.ts';

/** Prefix of a llama-server MCP server's tool group id, which a configured server's id never has */
export const LLAMA_SERVER_MCP_GROUP_PREFIX = 'llama-server:';

/** The option llama-server reads its MCP servers from */
export const LLAMA_SERVER_MCP_CONFIG_OPTION = '--mcp-servers-config';

/** A config file for `--mcp-servers-config`, as the MCP servers page shows it */
export const LLAMA_SERVER_MCP_CONFIG_EXAMPLE = `{
  "mcpServers": {
    "my-server": {
      "command": "/path/to/server",
      "args": []
    }
  }
}`;

export interface LlamaServerMcpServer {
	/** The tool group the server's tools are listed and switched off under */
	groupId: string;
	/** The server's name in llama-server's config file */
	name: string;
	tools: ServerToolInfo[];
}

/**
 * The server a tool comes from. llama-server names it in `mcp_server`; an
 * older llama-server does not, and names the tool `<server>_<tool>`.
 */
function serverNameOf(info: ServerToolInfo): string {
	if (info.mcp_server) return info.mcp_server;

	const separator = info.tool.indexOf('_');

	return separator > 0 ? info.tool.slice(0, separator) : info.tool;
}

/** The MCP servers llama-server runs, in the order of its `/tools` listing, each with its tools */
export function llamaServerMcpServers(): LlamaServerMcpServer[] {
	const servers: LlamaServerMcpServer[] = [];

	for (const info of toolsStore.serverToolsOfType(ServerToolType.MCP)) {
		const name = serverNameOf(info);

		let server = servers.find((s) => s.name === name);

		if (!server) {
			server = { groupId: `${LLAMA_SERVER_MCP_GROUP_PREFIX}${name}`, name, tools: [] };
			servers.push(server);
		}

		server.tools.push(info);
	}

	return servers;
}

/** Whether llama-server runs the tool of this name for one of its MCP servers */
export function isLlamaServerMcpTool(name: string): boolean {
	return toolsStore.serverToolsOfType(ServerToolType.MCP).some((info) => info.tool === name);
}

/** Run a tool of one of llama-server's MCP servers, on llama-server */
export function executeLlamaServerMcpTool(
	name: string,
	rawArguments: string,
	signal?: AbortSignal
): Promise<ToolExecutionResult> {
	let args: Record<string, unknown> = {};

	try {
		const parsed: unknown = rawArguments ? JSON.parse(rawArguments) : {};

		if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
			args = parsed as Record<string, unknown>;
		}
	} catch {
		// arguments that are not JSON go as none: the server says what is missing
	}

	return ToolsService.executeTool(name, args, signal);
}
