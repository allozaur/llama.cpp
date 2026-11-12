import type { ExtensionContext } from '../types';
import DialogMcpServers from '$lib/components/app/dialogs/DialogMcpServers.svelte';
import McpLogo from '$lib/components/app/mcp/McpLogo.svelte';
import { ROUTES } from '$lib/constants';

/** The sidebar's MCP entry: the MCP servers dialog on a desktop or tablet, their page on a phone. */
export function contributeNavigation(ctx: ExtensionContext): void {
	ctx.contribute('navigation', {
		dialog: DialogMcpServers,
		icon: McpLogo,
		id: 'mcp',
		placement: 'footer',
		route: ROUTES.MCP_SERVERS,
		tooltip: 'MCP'
	});
}
