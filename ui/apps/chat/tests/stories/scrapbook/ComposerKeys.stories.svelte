<script lang="ts" module>
	import ComposerKeys from './composer-keys/ComposerKeys.svelte';
	import { defineMeta } from '@storybook/addon-svelte-csf';

	// proposals for the chat form's add key and model selector trigger, which blend into the white chat form in light:
	// a darker fill, a tighter shadow, or a hairline edge instead of the drop. C was chosen: the keys take --elevation-key
	const { Story } = defineMeta({
		parameters: {
			controls: { disable: true },
			layout: 'fullscreen'
		},
		title: 'Scrapbook/UI/Composer keys'
	});
</script>

<Story asChild name="Side by side">
	<ComposerKeys />
</Story>
