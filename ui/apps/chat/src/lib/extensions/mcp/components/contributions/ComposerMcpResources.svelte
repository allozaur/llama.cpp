<script lang="ts">
	import type { ComposerAttachmentsProps } from '../../../points/composer';
	import { mcpStore } from '../../stores/index.svelte';
	import ChatFormMcpResourcesList from '../chat/ChatFormMcpResourcesList.svelte';
	import DialogMcpResourcesBrowser from '../dialogs/DialogMcpResourcesBrowser.svelte';
	import type { MCPResourceInfo } from '$lib/types';

	let { class: className }: ComposerAttachmentsProps = $props();

	let isResourceDialogOpen = $state(false);
	let preSelectedResourceUri = $state<string | undefined>(undefined);
</script>

<!-- draws nothing while no resource is attached -->
<ChatFormMcpResourcesList
	class={className}
	onResourceClick={(uri) => {
		preSelectedResourceUri = uri;
		isResourceDialogOpen = true;
	}}
/>

<DialogMcpResourcesBrowser
	bind:open={isResourceDialogOpen}
	onAttach={(resource: MCPResourceInfo) => {
		mcpStore.attachResource(resource.uri);
	}}
	onOpenChange={(newOpen: boolean) => {
		if (!newOpen) {
			preSelectedResourceUri = undefined;
		}
	}}
	preSelectedUri={preSelectedResourceUri}
/>
