<script lang="ts">
	import { Button } from '@ggml/llama-ui/ui/button';
	import { Plus, Radio } from '@lucide/svelte';
	import { BackendCard, DialogBackendForm } from '$lib/components/app/backends';
	import { BackendKind } from '$lib/enums';
	import { backendsModelsStore, backendsStore, remoteAccessStore, serverStore } from '$lib/stores';
	import type { Backend } from '$lib/types';
	import { fade } from 'svelte/transition';

	interface Props {
		class?: string;
	}

	let { class: className }: Props = $props();

	let providers = $derived(backendsStore.external);
	/** Nothing to talk to: the page has no server and no provider was paired. */
	let isEmpty = $derived(serverStore.localServerMissing && providers.length === 0);

	let isAdding = $state(false);
	let editing = $state<Backend | null>(null);
	let addingKind = $state<BackendKind | undefined>(undefined);

	function handleAdd(kind?: BackendKind) {
		editing = null;
		addingKind = kind;
		isAdding = true;
	}

	function handleEdit(backend: Backend) {
		editing = backend;
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
	<DialogBackendForm
		bind:open={isAdding}
		backend={editing}
		defaultKind={addingKind}
		onOpenChange={handleOpenChange}
		onPaired={() => void backendsModelsStore.loadAll()}
		onSaved={() => void backendsModelsStore.loadAll()}
	/>

	{#if !serverStore.localServerMissing}
		<BackendCard
			backend={backendsStore.local}
			isLocal
			onToggle={(enabled) => backendsStore.setLocalEnabled(enabled)}
		/>
	{/if}

	{#each providers as backend (backend.id)}
		<BackendCard
			{backend}
			onConnect={() => void backendsModelsStore.connectAndLoad(backend.id)}
			onDelete={() => {
				backendsStore.removeBackend(backend.id);
				void backendsModelsStore.loadAll();
			}}
			onDisconnect={() => remoteAccessStore.disconnect(backend.id)}
			onEdit={() => handleEdit(backend)}
			onToggle={(enabled) => {
				backendsStore.updateBackend(backend.id, { enabled });
				void backendsModelsStore.loadAll();
			}}
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

			<Button onclick={() => handleAdd(BackendKind.REMOTE)} size="sm">
				<Radio />

				Pair a remote server
			</Button>
		{:else}
			<Button onclick={() => handleAdd()} size="sm">
				<Plus />

				Add new provider
			</Button>

			<p class="text-xs text-muted-foreground">
				Point at another llama-server, or pair one by its access code.
			</p>
		{/if}
	</div>
</div>
