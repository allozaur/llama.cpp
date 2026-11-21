import type { StorybookConfig } from '@storybook/sveltekit';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const config: StorybookConfig = {
	stories: ['../tests/stories/**/*.mdx', '../tests/stories/**/*.stories.@(js|ts|svelte)'],
	addons: [
		'@chromatic-com/storybook',
		'@storybook/addon-vitest',
		'@storybook/addon-a11y',
		'@storybook/addon-docs',
		'@storybook/addon-mcp'
	],
	framework: '@storybook/sveltekit',
	viteFinal: async (config) => {
		config.server = config.server || {};
		config.server.fs = config.server.fs || {};
		config.server.fs.allow = [...(config.server.fs.allow || []), resolve(__dirname, '../tests')];
		return config;
	},
	// the package's own sections, in the order Llama Chat's Storybook (ui/apps/chat) shows them under Llama UI:
	// the foundations, the base components, the app components, then the Model UI and the mockups
	storySorts: [
		{
			order: [
				'Introduction',
				'Llama UI',
				[
					'Foundations',
					['Colors', 'Typography', 'Sizing', 'Shapes', 'Elevation', 'Surfaces'],
					'Components',
					['Actions', 'Forms', 'Display', 'Overlays', 'Navigation'],
					'App components',
					'Models',
					'Mockups'
				]
			]
		}
	]
};
export default config;
