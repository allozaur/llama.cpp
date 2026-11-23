<script lang="ts">
	import * as AlertDialog from '@ggml-org/llama-ui/ui/alert-dialog';
	import { Button } from '@ggml-org/llama-ui/ui/button';
	import { Copy, ExternalLink, Loader2, ServerOff, Terminal } from '@lucide/svelte';
	import { LLAMA_APP_DOWNLOAD_URL, LLAMA_APP_LAUNCH_URL } from '#lib/constants/index.ts';
	import {
		deviceStore,
		modelsStore,
		serversModelsStore,
		serversStore,
		serverStore
	} from '#lib/stores/index.ts';
	import { copyToClipboard } from '#lib/utils/clipboard.ts';
	import {
		isLocalServer,
		isRemoteServer,
		isWithoutServer,
		llamaServeCommand
	} from '#lib/utils/servers.ts';

	let dismissed = $state(false);
	let retrying = $state(false);

	// on a phone "this computer" is the phone: there is nothing to start on it
	let isOwnDevice = $derived(deviceStore.isTouch && !serverStore.servesThisPage);
	// once per page load, and only once the startup looked everywhere it could;
	// a retry keeps it open while the servers are asked again
	let open = $derived(
		!dismissed &&
			!isOwnDevice &&
			serversStore.startupChecked &&
			serverStore.localServerMissing &&
			(retrying || isWithoutServer(serversStore.enabled, (id) => serversModelsStore.get(id)))
	);
	let command = $derived(llamaServeCommand(serversStore.defaultAddress));

	function handleOpenChange(value: boolean) {
		if (!value) dismissed = true;
	}

	async function handleRetry() {
		retrying = true;

		try {
			const urlServers = serversStore.enabled.filter(
				(server) => !isLocalServer(server) && !isRemoteServer(server)
			);

			await Promise.all(urlServers.map((server) => serversModelsStore.reload(server.id)));

			if (serverStore.servesThisPage) await serverStore.fetch();

			await modelsStore.switchServer();
			await modelsStore.ensureFirstModelSelected();
		} finally {
			retrying = false;
		}
	}
</script>

<AlertDialog.Root onOpenChange={handleOpenChange} {open}>
	<AlertDialog.Content class="max-w-md">
		<AlertDialog.Header>
			<AlertDialog.Title class="flex items-center gap-2">
				<ServerOff class="size-icon-lg" />
				No llama-server found
			</AlertDialog.Title>

			<AlertDialog.Description>
				Llama Chat looked for llama-server at
				<code class="font-mono">{serversStore.defaultAddress}</code>
				and got no answer. Start one on this computer, then try again.
			</AlertDialog.Description>
		</AlertDialog.Header>

		<div class="flex flex-col gap-3">
			<div class="flex items-center justify-between gap-3 rounded-lg border p-3">
				<div class="min-w-0">
					<p class="text-body-sm font-medium">Open the Llama app</p>

					<p class="text-caption text-muted-foreground">
						It runs llama-server for you.
						<a
							class="inline-flex items-center gap-0.5 underline underline-offset-2"
							href={LLAMA_APP_DOWNLOAD_URL}
							rel="external noopener noreferrer"
							target="_blank"
						>
							Get Llama <ExternalLink class="size-3" />
						</a>
					</p>
				</div>

				<Button href={LLAMA_APP_LAUNCH_URL} size="sm" variant="outline">Open Llama</Button>
			</div>

			<div class="flex flex-col gap-2 rounded-lg border p-3">
				<p class="flex items-center gap-1.5 text-body-sm font-medium">
					<Terminal class="size-3.5" />
					Or run llama-server in a terminal
				</p>

				<div class="flex items-center justify-between gap-2 rounded-md bg-muted px-3 py-2">
					<code class="truncate font-mono text-caption">{command}</code>

					<button
						aria-label="Copy the command"
						class="shrink-0 text-muted-foreground hover:text-foreground"
						onclick={() => copyToClipboard(command, 'Command copied')}
						type="button"
					>
						<Copy class="size-3.5" />
					</button>
				</div>
			</div>
		</div>

		<AlertDialog.Footer>
			<AlertDialog.Cancel>Not now</AlertDialog.Cancel>

			<Button disabled={retrying} onclick={handleRetry}>
				{#if retrying}
					<Loader2 class="size-3.5 animate-spin" />
				{/if}

				Try again
			</Button>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
