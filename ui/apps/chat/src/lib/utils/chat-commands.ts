import { SET_WORKING_DIRECTORY_LABEL } from '$lib/constants';
import { ChatFormCommandAction } from '$lib/enums';
import type { ComposerCommand } from '$lib/extensions/points/composer';
import type { ChatCommandsOptions, ChatFormCommand } from '$lib/types';

function toChatFormCommand(command: ComposerCommand): ChatFormCommand {
	return {
		description: command.description,
		disabled: !command.isEnabled(),
		icon: command.icon,
		keywords: command.keywords,
		name: command.name,
		run: (composer, args) => command.run(composer, args)
	};
}

/**
 * The slash commands surfaced by the `/` command picker, in display order:
 * the built-in ones, with the ones extensions contribute before or after
 * them, as their `order` says.
 *
 * Availability is supplied as predicates rather than store imports: this
 * module is re-exported through the `$lib/utils` barrel, and importing
 * stores at module load would create a circular dependency (the stores
 * themselves import from `$lib/utils`).
 */
export function getChatCommands(
	options: ChatCommandsOptions,
	contributed: ComposerCommand[] = []
): ChatFormCommand[] {
	const sorted = [...contributed].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

	return [
		...sorted.filter((command) => (command.order ?? 0) < 0).map(toChatFormCommand),
		{
			action: ChatFormCommandAction.CWD,
			description: SET_WORKING_DIRECTORY_LABEL,
			disabled: !options.hasCwdTools(),
			keywords: ['current working directory'],
			name: 'cwd'
		},
		{
			action: ChatFormCommandAction.MODEL,
			description: 'Select model',
			disabled: !options.showModelSelector,
			name: 'model'
		},
		{
			action: ChatFormCommandAction.COMPACT,
			description: 'Summarize the conversation to free up context',
			disabled: !options.canCompact(),
			keywords: ['summarize', 'context'],
			name: 'compact'
		},
		...sorted.filter((command) => (command.order ?? 0) >= 0).map(toChatFormCommand)
	];
}
