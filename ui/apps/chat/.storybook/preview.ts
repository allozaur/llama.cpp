import '../src/app.css';
import './docs.css';
import { applyColorScheme } from './color-scheme';
import ModeWatcherDecorator from './decorators/ModeWatcherDecorator.svelte';
import TooltipProviderDecorator from './decorators/TooltipProviderDecorator.svelte';
import type { Preview } from '@storybook/sveltekit';

applyColorScheme();
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyColorScheme);

const preview: Preview = {
	parameters: {
		controls: {
			matchers: {
				color: /(background|color)$/i,
				date: /Date$/i
			}
		},

		backgrounds: {
			disabled: true
		},

		options: {
			// sidebar sections: the introduction, the guidelines for agents, the philosophy, the architecture, then the UI: its
			// foundations first, the full chat screen leading its folder. The brand and communications are in llama-brand's Storybook
			storySort: {
				order: [
					'Introduction',
					'Agents',
					['Design guidelines'],
					'Philosophy',
					['Ideology', 'Product', 'Design'],
					'Architecture',
					['Stack', 'Chat', 'Channels'],
					'UI',
					[
						'Foundations',
						['Colors', 'Typography', 'Sizing', 'Shapes', 'Elevation', 'Surfaces', 'Brand'],
						'Actions',
						'Forms',
						'Display',
						'Overlays',
						'Navigation',
						'Patterns',
						'Blocks',
						[
							'Chat',
							['ChatScreen', ['ChatScreen', '*']],
							'Content',
							'Models',
							'MCP',
							'Navigation',
							'Settings',
							['DialogSettingsChat', 'Navigation', 'Sections'],
							'App'
						]
					],
					'Scrapbook',
					['About', 'UI']
				]
			}
		},

		a11y: {
			// 'todo' - show a11y violations in the test UI only
			// 'error' - fail CI on a11y violations
			// 'off' - skip a11y checks entirely
			test: 'todo'
		}
	},
	// read by tests/stories/pace.ts; the test runner always plays at full speed
	globalTypes: {
		interactionPace: {
			description: 'Speed of the interactions a story plays',
			toolbar: {
				dynamicTitle: true,
				icon: 'timer',
				items: [
					{ title: 'Human pace', value: 'human' },
					{ title: 'Instant', value: 'instant' }
				],
				title: 'Interaction pace'
			}
		},
		// the light surface theme: Paper (white panels on a grey page) or Matte (grey glass on white)
		surface: {
			description: 'Light surface theme',
			toolbar: {
				dynamicTitle: true,
				icon: 'paintbrush',
				items: [
					{ title: 'Paper', value: 'paper' },
					{ title: 'Matte', value: 'matte' }
				],
				title: 'Surface'
			}
		}
	},
	initialGlobals: {
		interactionPace: 'human',
		surface: 'paper'
	},
	decorators: [
		(story, context) => {
			document.documentElement.classList.toggle('theme-matte', context.globals.surface === 'matte');

			return story();
		},
		// `parameters.colorScheme` fixes a story to light or dark, whatever the viewer chose (a scene in a store screenshot)
		(story, context) => ({
			Component: ModeWatcherDecorator,
			props: {
				children: story,
				forced: context.parameters.colorScheme
			}
		}),
		(story) => ({
			Component: TooltipProviderDecorator,
			props: {
				children: story
			}
		})
	]
};

export default preview;
