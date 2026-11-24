import type { ExtensionContext } from '../types';
import McpServersPage from './components/contributions/McpServersPage.svelte';

/** Path of the MCP servers page, where the sidebar's MCP entry leads on a phone. */
export const MCP_SERVERS_PAGE_PATH = 'mcp-servers';

/** The MCP servers page. */
export function contributePages(ctx: ExtensionContext): void {
	ctx.contribute('pages', {
		component: McpServersPage,
		path: MCP_SERVERS_PAGE_PATH,
		title: 'MCP Servers'
	});
}
