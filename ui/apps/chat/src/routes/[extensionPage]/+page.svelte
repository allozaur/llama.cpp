<script lang="ts">
	import { APP_NAME, ROUTES } from '#lib/constants/index.ts';
	import { extensions } from '#lib/extensions/index.ts';
	import { goto, refreshAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';

	const registered = $derived(
		extensions
			.contributions('pages', { unavailable: true })
			.find((p) => p.path === page.params.extensionPage)
	);
	const availability = $derived(registered && extensions.availabilityOf('pages', registered));
	const contributed = $derived(availability === true ? registered : undefined);

	$effect(() => {
		// its extension was switched off while the page is shown: the load runs again and ends in the 404
		if (!registered) void refreshAll();
		// its extension is not available, as MCP on a server without the agentic features
		else if (availability === false) void goto(resolve(ROUTES.START));
	});
</script>

<svelte:head>
	{#if contributed}
		<title>{contributed.title} - {APP_NAME}</title>
	{/if}
</svelte:head>

<!-- every page an extension contributes: the app's own routes take precedence over this one -->
{#if contributed}
	<contributed.component />
{/if}
