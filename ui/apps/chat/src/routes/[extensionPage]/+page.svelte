<script lang="ts">
	import { APP_NAME } from '#lib/constants/index.ts';
	import { extensions } from '#lib/extensions/index.ts';
	import { refreshAll } from '$app/navigation';
	import { page } from '$app/state';

	const contributed = $derived(
		extensions.contributions('pages').find((p) => p.path === page.params.extensionPage)
	);

	// its extension was switched off while the page is shown: the load runs again and ends in the 404
	$effect(() => {
		if (!contributed) void refreshAll();
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
