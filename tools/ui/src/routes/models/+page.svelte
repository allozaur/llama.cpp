<script lang="ts">
	import { ArrowLeft, Server } from '@lucide/svelte';
	import ModelsManager from '$lib/components/app/models/ModelsManager/ModelsManager.svelte';
	import ModelsManagerModelProviders from '$lib/components/app/models/ModelsManager/ModelsManagerModelProviders.svelte';
	import { Button } from '$lib/components/ui/button';
	import { APP_NAME, DISCOVER_ICON } from '$lib/constants';
	import { modelsStore, uiStore } from '$lib/stores';
	import { onMount } from 'svelte';

	// the manager's second view: the providers its models come from
	let showProviders = $state(false);

	// a direct load lands here before any chat has listed the models, and the root
	// layout fetches the router details once that list arrives. An already loaded
	// list only needs the router fetch as a sync point (a no-op outside router mode)
	onMount(() => {
		if (modelsStore.models.length > 0) {
			void modelsStore.fetchRouterModels();

			return;
		}

		modelsStore.fetch().catch((error) => console.error('Unable to load models:', error));
	});
</script>

<svelte:head>
	<title>Models - {APP_NAME}</title>
</svelte:head>

<div
	class="mx-auto flex h-[100dvh] w-full max-w-7xl flex-col gap-6 px-4 pt-(--page-top) md:px-8 md:pt-6"
>
	<div class="flex items-start gap-4">
		{#if showProviders}
			<Button
				aria-label="Back to models"
				class="shrink-0"
				onclick={() => (showProviders = false)}
				size="icon"
				variant="ghost"
			>
				<ArrowLeft class="size-icon-md" />
			</Button>
		{/if}

		<div class="flex min-w-0 flex-col gap-1">
			<h1 class="text-2xl font-semibold tracking-tight">
				{showProviders ? 'Providers' : 'Models'}
			</h1>

			<p class="text-sm text-muted-foreground">
				{showProviders
					? 'Add the servers and providers your models come from.'
					: 'Load, configure and remove the models this server can run.'}
			</p>
		</div>

		{#if !showProviders}
			<div class="ml-auto flex shrink-0 items-center gap-2">
				{#if uiStore.isDiscoverEnabled}
					<Button
						class="gap-1.5"
						onclick={() => uiStore.openModelsDiscover()}
						size="sm"
						variant="secondary"
					>
						<DISCOVER_ICON class="size-icon-md" />

						Discover Models
					</Button>
				{/if}

				<Button
					class="gap-1.5"
					onclick={() => (showProviders = true)}
					size="sm"
					variant="secondary"
				>
					<Server class="size-icon-md" />

					Manage Providers
				</Button>
			</div>
		{/if}
	</div>

	{#if showProviders}
		<div class="min-h-0 flex-1 overflow-y-auto">
			<ModelsManagerModelProviders />
		</div>
	{:else}
		<ModelsManager class="min-h-0" />
	{/if}
</div>
