<script lang="ts" module>
	import StateGallery from '../helpers/StateGallery.svelte';
	import StateGalleryItem from '../helpers/StateGalleryItem.svelte';
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { CommandBox } from '@ggml-org/llama-ui/app/content';
	import { expect, fn } from 'storybook/test';

	const INSTALL_COMMAND = 'curl -LsSf https://llama.app/install.sh | sh';
	const SERVE_COMMAND = 'llama serve -hf ggml-org/gemma-4-e4b-it-GGUF:Q4_0';
	const CASK_COMMAND = 'brew install --cask llama-app';

	const onCopy = fn();

	// a shell command to copy, as llama.app shows its install commands
	const { Story } = defineMeta({
		component: CommandBox,
		parameters: {
			layout: 'centered'
		},
		title: 'Llama UI/App components/CommandBox'
	});
</script>

<Story asChild name="Default">
	<StateGallery columns={1}>
		<StateGalleryItem label="Default" note="programs in cinder, flags and pipes muted">
			<CommandBox command={INSTALL_COMMAND} />
		</StateGalleryItem>

		<StateGalleryItem label="With prompt" note="the $ is not copied">
			<CommandBox command={SERVE_COMMAND} prompt />
		</StateGalleryItem>

		<StateGalleryItem label="Compact" note="an aside in small print">
			<div class="w-fit">
				<CommandBox command={CASK_COMMAND} compact />
			</div>
		</StateGalleryItem>

		<StateGalleryItem label="Narrow" note="wraps at spaces">
			<div class="w-56">
				<CommandBox command={SERVE_COMMAND} />
			</div>
		</StateGalleryItem>
	</StateGallery>
</Story>

<Story
	asChild
	name="Copies"
	play={async ({ canvas, userEvent }) => {
		const written: string[] = [];

		Object.defineProperty(navigator, 'clipboard', {
			configurable: true,
			value: { writeText: async (text: string) => void written.push(text) }
		});

		await userEvent.click(await canvas.findByRole('button', { name: 'Copy command' }));

		await expect(written).toEqual([SERVE_COMMAND]);
		await expect(onCopy).toHaveBeenCalledWith(SERVE_COMMAND);
		await expect(await canvas.findByRole('button', { name: 'Copied command' })).toBeVisible();
	}}
	tags={['!dev']}
>
	<CommandBox command={SERVE_COMMAND} {onCopy} prompt />
</Story>
