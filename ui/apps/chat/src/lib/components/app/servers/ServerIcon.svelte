<script lang="ts">
	import type { Server } from '$lib/types';
	import { serverFaviconUrl } from '$lib/utils';
	import type { Snippet } from 'svelte';
	import { SvelteSet } from 'svelte/reactivity';

	/** Favicons that failed to load, so a row remount does not ask again. */
	const failedFavicons = new SvelteSet<string>();

	interface Props {
		server?: Server;
		class?: string;
		/** Rendered when the server serves no favicon. */
		fallback?: Snippet;
	}

	let { class: className = 'size-4', fallback, server }: Props = $props();

	let faviconUrl = $derived(server ? serverFaviconUrl(server.baseUrl) : null);
</script>

{#if faviconUrl && !failedFavicons.has(faviconUrl)}
	<img
		alt=""
		class={['shrink-0 rounded-sm object-contain', className]}
		decoding="async"
		loading="lazy"
		onerror={() => failedFavicons.add(faviconUrl)}
		src={faviconUrl}
	/>
{:else}
	{@render fallback?.()}
{/if}
