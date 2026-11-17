<script lang="ts" module>
	import Product from './Product.svx';
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import Editorial from '$llama-ui-stories/editorial/Editorial.svelte';

	// How the products fit together: the Llama stack, Llama UI and the apps, and how Llama Chat ships
	const { Story } = defineMeta({
		parameters: {
			controls: { disable: true },
			layout: 'fullscreen'
		},
		title: 'Philosophy/Product'
	});
</script>

<Story asChild name="Product">
	<Editorial>
		<Product />
	</Editorial>
</Story>
