<script lang="ts">
	import { KeyRound } from '@lucide/svelte';
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import type { MCPServerSettingsEntry } from '$lib/types';
	import { mcpStore } from '$lib/stores/mcp.svelte';
	import { BrowserMcpOAuthProvider } from '$lib/services/mcp-oauth.service';
	import { McpServerIdentity } from '$lib/components/app/mcp';

	interface Props {
		open: boolean;
		server?: MCPServerSettingsEntry | null;
		onOpenChange?: (open: boolean) => void;
	}

	let { open = $bindable(), server = null, onOpenChange }: Props = $props();

	let displayName = $derived(server ? mcpStore.getServerLabel(server) : 'this server');
	let faviconUrl = $derived(server ? mcpStore.getServerFavicon(server.id) : null);

	function handleOpenChange(newOpen: boolean) {
		open = newOpen;
		onOpenChange?.(newOpen);
	}

	function handleAuthorize() {
		if (!server) return;

		// Start the OAuth flow by opening a window and beginning authorization
		const authorizationWindow = window.open('about:blank', '_blank');
		BrowserMcpOAuthProvider.beginInteractiveAuthorization(authorizationWindow);

		// Trigger health check to complete the connection after OAuth
		mcpStore.runHealthCheck(server);

		handleOpenChange(false);
	}
</script>

<AlertDialog.Root {open} onOpenChange={handleOpenChange}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title class="flex items-center gap-2">
				<KeyRound class="h-5 w-5 text-primary" />

				Authorize MCP Server
			</AlertDialog.Title>

			<AlertDialog.Description>
				Would you like to authorize
				<span class="font-medium">
					{displayName}
				</span>
				to connect using OAuth?
			</AlertDialog.Description>
		</AlertDialog.Header>

		{#if server}
			<div class="rounded-lg border bg-muted/30 p-3">
				<McpServerIdentity
					{displayName}
					{faviconUrl}
					iconClass="h-6 w-6"
					iconRounded="rounded"
					nameClass="leading-5 text-sm font-medium"
				/>
			</div>
		{/if}

		<AlertDialog.Footer>
			<AlertDialog.Cancel onclick={() => handleOpenChange(false)}>Cancel</AlertDialog.Cancel>
			<AlertDialog.Action onclick={handleAuthorize}>Authorize</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
