<script lang="ts" module>
	import Page from './Extensions.svx';
	import Frame from './Frame.svelte';
	import { defineMeta } from '@storybook/addon-svelte-csf';

	const { Story } = defineMeta({
		parameters: {
			controls: { disable: true },
			layout: 'fullscreen'
		},
		title: 'Architecture/Extensions'
	});
</script>

<Story asChild name="Extensions">
	<Frame>
		<Page />
	</Frame>
</Story>
