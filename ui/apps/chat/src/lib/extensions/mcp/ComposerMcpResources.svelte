<script lang="ts">
	import type { ComposerAttachmentsProps } from '../points/composer';
	import {
		ChatFormMcpResourcesList,
		DialogMcpResourcesBrowser
	} from '#lib/components/app/index.ts';
	import { mcpStore } from '#lib/stores/index.ts';
	import type { MCPResourceInfo } from '#lib/types/index.ts';

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
