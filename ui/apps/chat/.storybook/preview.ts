import '../src/app.css';
import { MEDIA_QUERIES } from '#lib/constants/pwa.constants.ts';
import { agenticMode } from '#lib/stores/agentic-mode.svelte.ts';
// the docs pages' styles, shared with the library's Storybook
import '../../../lib/ui/.storybook/docs.css';
import { applyColorScheme } from './color-scheme';
import ModeWatcherDecorator from './decorators/ModeWatcherDecorator.svelte';
import TooltipProviderDecorator from './decorators/TooltipProviderDecorator.svelte';
import type { Preview } from '@storybook/sveltekit';

// the stories show the app as with a llama-server started with --agent
agenticMode.serverHasTools = true;

applyColorScheme();
window.matchMedia(MEDIA_QUERIES.PREFERS_DARK).addEventListener('change', applyColorScheme);

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

		a11y: {
			// 'todo' shows violations in the Accessibility panel and the test UI without failing a test; 'error' would
			// fail CI on them. Not yet 'error': about half the stories fail it, most on colour contrast (the muted
			// foreground on the light surfaces, below 4.5:1) and nested interactive controls, which need design changes
			// rather than story fixes. Switch once those are settled
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
		}
	},
	initialGlobals: {
		interactionPace: 'human'
	},
	decorators: [
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
