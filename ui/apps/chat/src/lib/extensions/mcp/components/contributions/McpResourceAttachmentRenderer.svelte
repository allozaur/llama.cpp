<script lang="ts">
	import type { AttachmentRendererProps } from '../../../points/renderers';
	import ChatAttachmentsListItemMcpResource from '../chat/ChatAttachmentsListItemMcpResource.svelte';
	import DialogMcpResourcePreview from '../dialogs/DialogMcpResourcePreview.svelte';
	import { AttachmentType } from '$lib/enums';
	import type { DatabaseMessageExtraMcpResource, MCPResourceAttachment } from '$lib/types';

	let { class: className = '', item }: AttachmentRendererProps = $props();

	// the preview dialog is mounted on the first click
	let previewExtra = $state<DatabaseMessageExtraMcpResource | null>(null);
	let previewOpen = $state(false);

	let extra = $derived(
		item.attachment?.type === AttachmentType.MCP_RESOURCE ? item.attachment : null
	);

	function toMcpResourceAttachment(
		extra: DatabaseMessageExtraMcpResource,
		id: string
	): MCPResourceAttachment {
		return {
			id,
			resource: {
				name: extra.name,
				serverName: extra.serverName,
				title: extra.name,
				uri: extra.uri
			}
		};
	}

	function openPreview(extra: DatabaseMessageExtraMcpResource) {
		previewExtra = extra;
		previewOpen = true;
	}
</script>

{#if extra}
	<ChatAttachmentsListItemMcpResource
		attachment={toMcpResourceAttachment(extra, item.id)}
		class="flex-shrink-0 {className}"
		onclick={() => openPreview(extra)}
	/>
{/if}

{#if previewExtra}
	<DialogMcpResourcePreview bind:open={previewOpen} extra={previewExtra} />
{/if}
