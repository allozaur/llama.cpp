import type { ExtensionContext } from '../types';
import McpServersPage from './components/contributions/McpServersPage.svelte';

/** The MCP servers page. Its path is what `ROUTES.MCP_SERVERS` leads to. */
export function contributePages(ctx: ExtensionContext): void {
	ctx.contribute('pages', {
		component: McpServersPage,
		path: 'mcp-servers',
		title: 'MCP Servers'
	});
}
