<!-- The new-chat screen's heading, above the suggestions -->
<script lang="ts">
	import type { BrandSlotProps } from '../brand.ts';
	import { serverStore } from '#lib/stores/index.ts';

	let { brand }: BrandSlotProps = $props();
</script>

<h1 class="mb-2 text-2xl font-semibold tracking-tight md:text-3xl">{brand.greeting.title}</h1>

<p class="text-muted-foreground md:text-lg">
	{#if brand.greeting.subtitle}
		{brand.greeting.subtitle}
	{:else}
		{serverStore.props?.modalities?.audio ? 'Record audio, type a message ' : 'Type a message'} or upload
		files to get started
	{/if}
</p>
