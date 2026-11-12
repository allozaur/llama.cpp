import type { ExtensionContext } from '../types';
import DialogMcpServers from '#lib/components/app/dialogs/DialogMcpServers.svelte';
import McpLogo from '#lib/components/app/mcp/McpLogo.svelte';
import SettingsMcpServers from '#lib/components/app/settings/SettingsMcpServers.svelte';
import { MANAGE_MCP_SERVERS_LABEL, SETTINGS_KEYS } from '#lib/constants/index.ts';

const MCP_SERVERS_ACTION_ID = 'mcp-servers';
/** Title of the MCP servers page in a phone's settings sheet. */
const MCP_SERVERS_PAGE_TITLE = 'MCP servers';

/** Manage MCP servers, under the Enable MCP setting: the servers' dialog, their page on a phone. */
export function contributeSettings(ctx: ExtensionContext): void {
	ctx.contribute('settingsActions', {
		dialog: DialogMcpServers,
		icon: McpLogo,
		id: MCP_SERVERS_ACTION_ID,
		label: MANAGE_MCP_SERVERS_LABEL,
		page: SettingsMcpServers,
		settingKey: SETTINGS_KEYS.ENABLE_MCP,
		title: MCP_SERVERS_PAGE_TITLE
	});
}
