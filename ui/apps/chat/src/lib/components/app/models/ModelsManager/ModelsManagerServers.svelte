<script lang="ts">
	import { Plus, Radio } from '@lucide/svelte';
	import { DialogServerForm, ServerCard } from '$lib/components/app/servers';
	import { Button } from '$lib/components/ui/button';
	import { ServerKind } from '$lib/enums';
	import { remoteAccessStore, serversModelsStore, serversStore, serverStore } from '$lib/stores';
	import type { Server } from '$lib/types';
	import { fade } from 'svelte/transition';

	interface Props {
		class?: string;
	}

	let { class: className }: Props = $props();

	let servers = $derived(serversStore.external);
	/** Nothing to talk to: the page has no server and no server was paired. */
	let isEmpty = $derived(serverStore.localServerMissing && servers.length === 0);

	let isAdding = $state(false);
	let editing = $state<Server | null>(null);
	let addingKind = $state<ServerKind | undefined>(undefined);

	function handleAdd(kind?: ServerKind) {
		editing = null;
		addingKind = kind;
		isAdding = true;
	}

	function handleEdit(server: Server) {
		editing = server;
		isAdding = true;
	}

	function handleOpenChange(open: boolean) {
		isAdding = open;

		if (!open) {
			editing = null;
		}
	}
</script>

<div
	in:fade={{ duration: 150 }}
	class={['grid gap-4', className]}
	style="grid-template-columns: repeat(auto-fill, minmax(min(25rem, calc(100dvw - 4rem)), 1fr));"
>
	<DialogServerForm
		bind:open={isAdding}
		defaultKind={addingKind}
		onOpenChange={handleOpenChange}
		onPaired={() => void serversModelsStore.loadAll()}
		onSaved={() => void serversModelsStore.loadAll()}
		server={editing}
	/>

	{#if !serverStore.localServerMissing}
		<ServerCard
			isLocal
			onToggle={(enabled) => serversStore.setLocalEnabled(enabled)}
			server={serversStore.local}
		/>
	{/if}

	{#each servers as server (server.id)}
		<ServerCard
			onConnect={() => void serversModelsStore.connectAndLoad(server.id)}
			onDelete={() => {
				serversStore.removeServer(server.id);
				void serversModelsStore.loadAll();
			}}
			onDisconnect={() => remoteAccessStore.disconnect(server.id)}
			onEdit={() => handleEdit(server)}
			onToggle={(enabled) => {
				serversStore.updateServer(server.id, { enabled });
				void serversModelsStore.loadAll();
			}}
			{server}
		/>
	{/each}

	<div
		class="flex w-full flex-col items-center justify-center gap-4 rounded-xl border border-dashed p-6"
	>
		{#if isEmpty}
			<Radio class="h-8 w-8 text-muted-foreground" />

			<div class="max-w-sm space-y-1 text-center">
				<p class="text-sm font-medium">This page has no server of its own</p>

				<p class="text-xs text-muted-foreground">
					Start one with <span class="font-mono">llama-server --connect</span> and paste the access code
					it prints, or point at a llama-server by its URL.
				</p>
			</div>

			<Button onclick={() => handleAdd(ServerKind.REMOTE)} size="sm">
				<Radio />

				Pair a remote server
			</Button>
		{:else}
			<Button onclick={() => handleAdd()} size="sm">
				<Plus />

				Add new server
			</Button>

			<p class="text-xs text-muted-foreground">
				Point at another llama-server, or pair one by its access code.
			</p>
		{/if}
	</div>
</div>
