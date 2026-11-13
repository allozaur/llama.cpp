<script lang="ts" module>
	import { getPace } from '../pace';
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import SettingsChatExtensionsTab from '$lib/components/app/settings/SettingsChat/SettingsChatExtensionsTab.svelte';
	import { ExtensionRegistry } from '$lib/extensions';
	import { BUILT_IN_EXTENSIONS } from '$lib/extensions/builtin';
	import { expect, waitFor } from 'storybook/test';

	// the Extensions section of the settings: the known extensions, each with its switch
	const { Story } = defineMeta({
		component: SettingsChatExtensionsTab,
		parameters: {
			layout: 'centered'
		},
		title: 'UI/Blocks/Settings/SettingsChatExtensionsTab'
	});

	const idle = async () => ({ default: { activate: () => {} } });

	// registries of the stories' own, so a switch here never touches the app's extensions
	const builtIn = new ExtensionRegistry({ storageKey: null });

	// the built-in extensions by name and description, without their code
	for (const manifest of BUILT_IN_EXTENSIONS) {
		builtIn.register({ ...manifest, id: `story-built-in-${manifest.id}`, load: idle });
	}

	const states = new ExtensionRegistry({ storageKey: null });

	states.register({
		description: 'Connect MCP servers and use their tools, prompts and resources in chats.',
		id: 'story-states-on',
		load: idle,
		name: 'MCP'
	});
	states.register({
		description: 'Keep notes beside a chat and hand them to the model.',
		disabledByDefault: true,
		id: 'story-states-off',
		load: idle,
		name: 'Notes'
	});
	states.register({
		description: 'Read web pages aloud.',
		id: 'story-states-failed',
		load: async () => {
			throw new Error('Failed to fetch dynamically imported module');
		},
		name: 'Voice'
	});

	const switching = new ExtensionRegistry({ storageKey: null });

	switching.register({
		description: 'Keep notes beside a chat and hand them to the model.',
		id: 'story-switching',
		load: idle,
		name: 'Notes'
	});
</script>

{#snippet frame(args: { registry?: ExtensionRegistry })}
	<div class="w-[min(32rem,calc(100vw-2rem))]">
		<SettingsChatExtensionsTab {...args} />
	</div>
{/snippet}

<!-- the extensions the app is built with, as the settings list them -->
<Story
	args={{ registry: builtIn }}
	beforeEach={async () => {
		await builtIn.activateEnabled();
	}}
	name="Default"
	play={async ({ canvas }) => {
		await expect(canvas.getByRole('switch', { name: 'MCP' })).toBeChecked();
	}}
	template={frame}
/>

<!-- switched on, switched off, and one that failed to load -->
<Story
	args={{ registry: states }}
	beforeEach={async () => {
		await states.activateEnabled();
	}}
	name="States"
	play={async ({ canvas }) => {
		await expect(canvas.getByRole('switch', { name: 'MCP' })).toBeChecked();
		await expect(canvas.getByRole('switch', { name: 'Notes' })).not.toBeChecked();
		await expect(canvas.getByRole('switch', { name: 'Voice' })).toBeChecked();
		await expect(await canvas.findByRole('alert')).toHaveTextContent(
			'Voice did not start: Failed to fetch dynamically imported module. Switch it off and on to try again.'
		);
	}}
	template={frame}
/>

<!-- a switch takes effect at once; the story leaves the extension on, as it found it -->
<Story
	args={{ registry: switching }}
	beforeEach={async () => {
		await switching.setEnabled('story-switching', true);
	}}
	name="SwitchOffAndOn"
	play={async (context) => {
		const { canvas } = context;
		const pace = getPace(context);
		const notes = canvas.getByRole('switch', { name: 'Notes' });

		await expect(notes).toBeChecked();
		await pace.pause();
		await pace.user.click(notes);
		await expect(notes).not.toBeChecked();
		await waitFor(() => expect(switching.extensions[0].state).toBe('inactive'));

		await pace.pause();
		await pace.user.click(notes);
		await expect(notes).toBeChecked();
		await waitFor(() => expect(switching.extensions[0].state).toBe('active'));
	}}
	template={frame}
/>
