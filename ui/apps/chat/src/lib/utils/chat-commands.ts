import { CWD_COMMAND_NAME, SET_WORKING_DIRECTORY_LABEL } from '#lib/constants/index.ts';
import { ChatFormCommandAction } from '#lib/enums/index.ts';
import type { ComposerCommand } from '#lib/extensions/points/composer.ts';
import type { ChatCommandsOptions, ChatFormCommand } from '#lib/types/index.ts';

function toChatFormCommand(command: ComposerCommand): ChatFormCommand {
	return {
		description: command.description,
		disabled: !command.isEnabled(),
		keywords: command.keywords,
		name: command.name,
		run: (composer, args) => command.run(composer, args),
		takesArgument: command.takesArgument
	};
}

/**
 * The slash commands surfaced by the `/` command picker, in display order:
 * `/prompt` first, then the other built-in ones, with the ones extensions
 * contribute before or after those, as their `order` says.
 *
 * Availability is supplied as predicates rather than store imports: this
 * module is re-exported through the `#lib/utils/index.ts` barrel, and importing
 * stores at module load would create a circular dependency (the stores
 * themselves import from `#lib/utils/index.ts`).
 */
export function getChatCommands(
	options: ChatCommandsOptions,
	contributed: ComposerCommand[] = []
): ChatFormCommand[] {
	const sorted = [...contributed].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

	return [
		{
			action: ChatFormCommandAction.PROMPT,
			description: 'Insert a prompt',
			disabled: false,
			keywords: ['library'],
			name: 'prompt',
			takesArgument: true
		},
		...sorted.filter((command) => (command.order ?? 0) < 0).map(toChatFormCommand),
		{
			action: ChatFormCommandAction.CWD,
			description: SET_WORKING_DIRECTORY_LABEL,
			disabled: !options.hasCwdTools(),
			keywords: ['current working directory'],
			name: CWD_COMMAND_NAME,
			takesArgument: true
		},
		{
			action: ChatFormCommandAction.MODEL,
			description: 'Select model',
			disabled: !options.showModelSelector,
			name: 'model'
		},
		{
			action: ChatFormCommandAction.COMPACT,
			description: 'Summarize to free up context',
			disabled: !options.canCompact(),
			keywords: ['summarize', 'context'],
			name: 'compact'
		},
		{
			action: ChatFormCommandAction.SYSTEM_MESSAGE,
			description: 'Edit the system message',
			disabled: !options.canEditSystemMessage(),
			keywords: ['system prompt', 'instructions'],
			name: 'system-message'
		},
		...sorted.filter((command) => (command.order ?? 0) >= 0).map(toChatFormCommand)
	];
}
