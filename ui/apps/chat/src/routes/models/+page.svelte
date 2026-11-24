<script lang="ts">
	import ModelsDiscoverButton from '#lib/components/app/models/ModelsDiscoverButton.svelte';
	import ModelsManager from '#lib/components/app/models/ModelsManager/ModelsManager.svelte';
	import { APP_NAME } from '#lib/constants/index.ts';
	import { modelsStore, serverStore, uiStore } from '#lib/stores/index.ts';
	import { onMount } from 'svelte';

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
	class="mx-auto flex h-dvh w-full max-w-7xl flex-col gap-6 px-4 pt-(--page-top) md:px-8 md:pt-6"
>
	<div class="flex items-start gap-4">
		<div class="flex min-w-0 flex-col gap-1">
			<h1 class="text-heading tracking-tight">Models</h1>

			<p class="text-body-sm text-muted-foreground">
				Load, configure and remove the models this server can run.
			</p>
		</div>

		<!-- downloads need a router, so a single-model server shows it only once turned on -->
		{#if uiStore.isDiscoverEnabled || serverStore.isRouterMode}
			<ModelsDiscoverButton class="ml-auto shrink-0" />
		{/if}
	</div>

	<ModelsManager class="min-h-0" />
</div>
