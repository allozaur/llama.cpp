<script lang="ts">
	import DialogServerForm from './DialogServerForm.svelte';
	import * as AlertDialog from '@ggml-org/llama-ui/ui/alert-dialog';
	import { Button } from '@ggml-org/llama-ui/ui/button';
	import * as Tabs from '@ggml-org/llama-ui/ui/tabs';
	import { Copy, ExternalLink, Loader2, ServerOff, Terminal } from '@lucide/svelte';
	import { LLAMA_APP_DOWNLOAD_URL, LLAMA_APP_LAUNCH_URL } from '#lib/constants/index.ts';
	import { ServerKind, ServerSource } from '#lib/enums/index.ts';
	import {
		deviceStore,
		modelsStore,
		remoteAccessStore,
		serversModelsStore,
		serversStore,
		serverStore
	} from '#lib/stores/index.ts';
	import type { Server } from '#lib/types/index.ts';
	import { copyToClipboard } from '#lib/utils/clipboard.ts';
	import {
		isLocalServer,
		isRemoteServer,
		isWithoutServer,
		llamaServeCommand
	} from '#lib/utils/servers.ts';

	let dismissed = $state(false);
	let retrying = $state(false);
	let isAdding = $state(false);
	let addingKind = $state<ServerKind>(ServerKind.URL);

	// on a phone "this computer" is the phone: only a server elsewhere can serve it
	let isOwnDevice = $derived(deviceStore.isTouch && !serverStore.servesThisPage);
	let source = $state<ServerSource>(ServerSource.LOCAL);
	let shownSource = $derived(isOwnDevice ? ServerSource.EXTERNAL : source);
	// once per page load, and only once the startup looked everywhere it could;
	// a retry keeps it open while the servers are asked again
	let open = $derived(
		!dismissed &&
			serversStore.startupChecked &&
			serverStore.localServerMissing &&
			(retrying || isWithoutServer(serversStore.enabled, (id) => serversModelsStore.get(id)))
	);
	let command = $derived(llamaServeCommand(serversStore.defaultAddress));

	function handleOpenChange(value: boolean) {
		if (!value) dismissed = true;
	}

	function handleAdd(kind: ServerKind) {
		addingKind = kind;
		dismissed = true;
		isAdding = true;
	}

	async function handleConnected(server: Server) {
		serversStore.setActive(server.id);
		await serversModelsStore.ensureLoaded(server.id, { connect: true });
		await modelsStore.switchServer();
		await modelsStore.ensureFirstModelSelected();
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
				{#if isOwnDevice}
					This device has no llama-server of its own. Connect to one running on another computer.
				{:else}
					Llama Chat looked for llama-server at
					<code class="font-mono">{serversStore.defaultAddress}</code>
					and got no answer.
				{/if}
			</AlertDialog.Description>
		</AlertDialog.Header>

		{#if !isOwnDevice}
			<Tabs.Root
				class="w-full"
				onValueChange={(value) => (source = value as ServerSource)}
				value={source}
			>
				<Tabs.List class="bg-muted-foreground/10 w-full gap-1">
					<Tabs.Trigger
						class="data-[state=active]:border-muted hover:bg-muted-foreground/10"
						value={ServerSource.LOCAL}
					>
						Local server
					</Tabs.Trigger>

					<Tabs.Trigger
						class="data-[state=active]:border-muted hover:bg-muted-foreground/10"
						value={ServerSource.EXTERNAL}
					>
						External server
					</Tabs.Trigger>
				</Tabs.List>
			</Tabs.Root>
		{/if}

		{#if shownSource === ServerSource.LOCAL}
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
		{:else}
			<div class="flex flex-col gap-3">
				<div class="flex items-center justify-between gap-3 rounded-lg border p-3">
					<div class="min-w-0">
						<p class="text-body-sm font-medium">By its URL</p>

						<p class="text-caption text-muted-foreground">
							A llama-server this page can reach, with its API key if it has one.
						</p>
					</div>

					<Button onclick={() => handleAdd(ServerKind.URL)} size="sm" variant="outline">
						Add server
					</Button>
				</div>

				{#if remoteAccessStore.isEnabled}
					<div class="flex items-center justify-between gap-3 rounded-lg border p-3">
						<div class="min-w-0">
							<p class="text-body-sm font-medium">By its access code</p>

							<p class="text-caption text-muted-foreground">
								A llama-server started with <code class="font-mono">--connect</code>, paired over
								WebRTC.
							</p>
						</div>

						<Button onclick={() => handleAdd(ServerKind.REMOTE)} size="sm" variant="outline">
							Pair
						</Button>
					</div>
				{:else}
					<p class="text-caption text-muted-foreground">
						Pairing a server by its access code is experimental: switch it on in Settings, General.
					</p>
				{/if}
			</div>
		{/if}

		<AlertDialog.Footer>
			<AlertDialog.Cancel>Not now</AlertDialog.Cancel>

			{#if shownSource === ServerSource.LOCAL}
				<Button disabled={retrying} onclick={handleRetry}>
					{#if retrying}
						<Loader2 class="size-3.5 animate-spin" />
					{/if}

					Try again
				</Button>
			{/if}
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>

<DialogServerForm
	bind:open={isAdding}
	defaultKind={addingKind}
	onPaired={handleConnected}
	onSaved={handleConnected}
/>
