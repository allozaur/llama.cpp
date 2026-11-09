<script lang="ts">
	import * as Dialog from '@ggml/llama-ui/ui/dialog';
	import { Server } from '@lucide/svelte';
	import ModelsManagerServers from '$lib/components/app/models/ModelsManager/ModelsManagerServers.svelte';
	import { deviceStore, remoteAccessStore } from '$lib/stores';

	interface Props {
		onOpenChange?: (open: boolean) => void;
		open?: boolean;
	}

	let { onOpenChange, open = $bindable(false) }: Props = $props();

	function handleOpenChange(value: boolean) {
		open = value;
		onOpenChange?.(value);
	}
</script>

<!--
	The servers list is a dialog of its own rather than a view of the models
	dialog: pairing a server is what a phone needs to do before it has any model
	to pick, and the models dialog is desktop-only.
-->
<Dialog.Root onOpenChange={handleOpenChange} {open}>
	<Dialog.Content
		class="max-md:h-[100dvh]! max-md:w-screen! max-md:max-w-none! max-md:rounded-none! max-md:border-0! md:h-[calc(100vh-4rem)]! md:max-h-240! md:w-[calc(100vw-4rem)]! md:max-w-380! flex flex-col p-4"
		onOpenAutoFocus={(event) => deviceStore.isMobile && event.preventDefault()}
	>
		<Dialog.Header>
			<Dialog.Title class="flex items-center gap-2">
				<Server class="h-5 w-5" />

				<span>Servers</span>
			</Dialog.Title>

			<Dialog.Description class="sr-only">
				{remoteAccessStore.isEnabled
					? 'Pair a remote server by its access code, or point at one by its URL.'
					: 'Point at a llama-server by its URL.'}
			</Dialog.Description>
		</Dialog.Header>

		<div class="mt-4 min-h-0 flex-1 overflow-y-auto">
			<ModelsManagerServers />
		</div>
	</Dialog.Content>
</Dialog.Root>
