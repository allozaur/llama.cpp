<script lang="ts">
	import ModelsManagerServers from '$lib/components/app/models/ModelsManager/ModelsManagerServers.svelte';
	import { APP_NAME } from '$lib/constants';
	import { remoteAccessStore } from '$lib/stores';
</script>

<svelte:head>
	<title>Servers - {APP_NAME}</title>
</svelte:head>

<!-- a phone's servers: the page the sidebar and the chat's "no server" banner open there, where a
     desktop or tablet opens the servers dialog -->
<div
	class="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 pt-(--page-top) pb-16 max-md:pb-safe-24 md:px-8 md:pt-6"
>
	<div class="flex min-w-0 flex-col gap-1">
		<h1 class="text-2xl font-semibold tracking-tight">Servers</h1>

		<p class="text-sm text-muted-foreground">
			{remoteAccessStore.isEnabled
				? 'Pair a remote server by its access code, or point at one by its URL.'
				: 'Point at a llama-server by its URL.'}
		</p>
	</div>

	<ModelsManagerServers />
</div>
