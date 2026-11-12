<script lang="ts">
	import { AlertTriangle, Loader2, RefreshCw, Server } from '@lucide/svelte';
	import * as Alert from '$lib/components/ui/alert';
	import { ICON_CLASS_DEFAULT } from '$lib/constants';
	import { useBackendAvailability } from '$lib/hooks/use-backend-availability.svelte';
	import { serversStore, serverStore, uiStore } from '$lib/stores';

	const availability = useBackendAvailability();

	let isLoadingModel = $derived(serverStore.status === 503);
	// A single server leaves nowhere to switch to, so the banner is the only
	// place the failure can be reported. With another server available the
	// selector carries it instead, and stays usable.
	let isOnlyServer = $derived(serversStore.enabled.length <= 1);
	let hasError = $derived(availability.isOffline && isOnlyServer);
</script>

{#if hasError || isLoadingModel}
	<div class="pointer-events-auto mx-auto mb-4 max-w-[48rem] px-1">
		<Alert.Root variant={isLoadingModel ? 'default' : 'destructive'}>
			{#if isLoadingModel}
				<Loader2 class="{ICON_CLASS_DEFAULT} animate-spin" />
			{:else}
				<AlertTriangle class={ICON_CLASS_DEFAULT} />
			{/if}

			<Alert.Title class="flex items-center justify-between">
				<span>{isLoadingModel ? 'Loading model' : 'Server unavailable'}</span>

				{#if !isLoadingModel}
					<button
						class="flex items-center gap-1.5 rounded-lg bg-destructive/20 px-2 py-1 text-xs font-medium hover:bg-destructive/30 disabled:opacity-50"
						disabled={serverStore.loading}
						onclick={() => serverStore.fetch()}
					>
						<RefreshCw class="h-3 w-3 {serverStore.loading ? 'animate-spin' : ''}" />
						{serverStore.loading ? 'Retrying...' : 'Retry'}
					</button>
				{/if}
			</Alert.Title>

			{#if !isLoadingModel}
				<Alert.Description class="flex flex-col items-start gap-2">
					<span>{serverStore.error}</span>

					<!--nothing here can serve a request: pairing one is the way out-->
					<button
						class="flex items-center gap-1.5 rounded-lg bg-muted px-2 py-1 text-xs font-medium hover:bg-muted/70"
						onclick={() => uiStore.openServers()}
					>
						<Server class="h-3 w-3" />

						Pair a remote server
					</button>
				</Alert.Description>
			{/if}
		</Alert.Root>
	</div>
{/if}
