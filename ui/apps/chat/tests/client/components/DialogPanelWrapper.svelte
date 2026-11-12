<script lang="ts">
	import DialogSettingsChat from '$lib/components/app/dialogs/DialogSettingsChat.svelte';
	import DialogMcpServers from '$lib/extensions/mcp/components/dialogs/DialogMcpServers.svelte';

	let { panel }: { panel: 'mcp' | 'settings' } = $props();
</script>

{#if panel === 'settings'}
	<DialogSettingsChat open />
{:else}
	<DialogMcpServers open />
{/if}
