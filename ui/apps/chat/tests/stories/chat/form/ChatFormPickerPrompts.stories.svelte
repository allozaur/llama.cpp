<script lang="ts" module>
	import { libraryPrompts, mcpPrompts, mcpServers, override, seedStores } from './fixtures';
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { ChatFormPickerPrompts } from '#lib/components/app/index.ts';
	import type { ComposerHandle } from '#lib/extensions/index.ts';
	import { mcpStore } from '#lib/extensions/mcp/stores/index.svelte.ts';
	import { fn } from 'storybook/test';
	import type { ComponentProps } from 'svelte';

	const composer: ComposerHandle = {
		addUploadedFile: fn(),
		closePicker: fn(),
		focusInput: fn(),
		openPicker: fn(),
		updateUploadedFile: fn()
	};

	const { Story } = defineMeta({
		args: {
			anchor: null,
			composer,
			isOpen: true,
			onClose: fn(),
			query: ''
		},
		component: ChatFormPickerPrompts,
		parameters: {
			layout: 'centered'
		},
		title: 'Llama Chat/Chat/ChatForm/ChatFormPickerPrompts'
	});

	// keeps the picker in its loading state
	function seedLoading() {
		const restore = seedStores({ mcpServers });
		const restoreInit = override(
			mcpStore,
			'ensureInitialized',
			() => new Promise<boolean>(() => {})
		);

		return () => {
			restoreInit();
			restore();
		};
	}
</script>

{#snippet template(args: ComponentProps<typeof ChatFormPickerPrompts>)}
	<!-- the popover anchors to its parent and opens above it -->
	<div class="relative mt-96 h-12 w-[32rem] rounded-3xl border">
		<ChatFormPickerPrompts {...args} />
	</div>
{/snippet}

<Story
	beforeEach={() => seedStores({ libraryPrompts, mcpPrompts, mcpServers })}
	name="Default"
	{template}
/>

<Story
	beforeEach={() => seedStores({ libraryPrompts, mcpPrompts: [] })}
	name="LibraryOnly"
	{template}
/>

<Story
	args={{ query: 'review' }}
	beforeEach={() => seedStores({ libraryPrompts, mcpPrompts, mcpServers })}
	name="Filtered"
	{template}
/>

<Story beforeEach={seedLoading} name="Loading" {template} />

<Story
	beforeEach={() => seedStores({ libraryPrompts: [], mcpPrompts: [] })}
	name="Empty"
	{template}
/>
