<script lang="ts">
	import { Label } from '@ggml-org/llama-ui/ui/label';
	import { Switch } from '@ggml-org/llama-ui/ui/switch';
	import { ONBOARDING_MCP_SERVERS, SETTINGS_KEYS } from '#lib/constants/index.ts';
	import { mcpStore, settingsStore } from '#lib/stores/index.ts';
	import type { RecommendedMCPServer } from '#lib/types/index.ts';
	import { canonicalizeServerUrl } from '#lib/utils/index.ts';

	interface Props {
		/** Says what is turned on, for the conversation to keep as the user's answer. */
		onAnswer?: (answer: string | undefined) => void;
	}

	let { onAnswer }: Props = $props();

	/** The server entry a recommendation was added as, if it was. */
	function addedEntry(server: RecommendedMCPServer) {
		const url = canonicalizeServerUrl(server.url);

		return mcpStore.getServers().find((entry) => canonicalizeServerUrl(entry.url) === url);
	}

	function handleToggle(server: RecommendedMCPServer, checked: boolean) {
		const entry = addedEntry(server);

		if (checked && !entry) {
			mcpStore.addServer({ enabled: true, url: server.url });

			// MCP waits behind its setting; with a server added, show where to manage it
			settingsStore.updateConfig(SETTINGS_KEYS.ENABLE_MCP, true);
		} else if (!checked && entry) {
			mcpStore.removeServer(entry.id);
		}

		const names = ONBOARDING_MCP_SERVERS.filter(addedEntry).map((item) => item.name);

		onAnswer?.(names.length > 0 ? `Turn on ${names.join(', ')}` : undefined);
	}
</script>

<ul class="space-y-3">
	{#each ONBOARDING_MCP_SERVERS as server (server.id)}
		{@const id = `onboarding-mcp-${server.id}`}

		<li class="flex items-center gap-4 rounded-lg border border-border/60 p-4">
			{#if server.iconUrl}
				<img alt="" class="size-5 shrink-0 rounded" decoding="async" src={server.iconUrl} />
			{/if}

			<div class="min-w-0 flex-1">
				<Label class="font-medium" for={id}>{server.name}</Label>

				<p class="text-caption text-muted-foreground">{server.description}</p>
			</div>

			<Switch
				checked={Boolean(addedEntry(server))}
				{id}
				onCheckedChange={(checked) => handleToggle(server, checked)}
			/>
		</li>
	{/each}
</ul>

<p class="text-caption text-muted-foreground">
	A server you turn on is contacted from this browser. More servers, and ones that need a token, can
	be added in Settings, under Agent.
</p>
