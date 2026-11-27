// The `/` picker lists the built-in commands with the ones extensions
// contribute around them; without contributions only the built-in ones remain.

import type { ComposerCommand, ComposerHandle } from '#lib/extensions/index.ts';
import { getChatCommands } from '#lib/utils/chat-commands.ts';
import { describe, expect, it, vi } from 'vitest';

const OPTIONS = {
	canCompact: () => true,
	canEditSystemMessage: () => true,
	hasCwdTools: () => true,
	hasSkills: () => true,
	showModelSelector: true
};

function makeCommand(overrides: Partial<ComposerCommand> = {}): ComposerCommand {
	return {
		description: 'A contributed command',
		isEnabled: () => true,
		name: 'extra',
		run: () => {},
		...overrides
	};
}

const names = (contributed?: ComposerCommand[]) =>
	getChatCommands(OPTIONS, contributed).map((command) => command.name);

describe('getChatCommands', () => {
	it('lists only the built-in commands without contributions', () => {
		expect(names()).toEqual(['prompt', 'skill', 'cwd', 'model', 'compact', 'system-message']);
		expect(names([])).toEqual(['prompt', 'skill', 'cwd', 'model', 'compact', 'system-message']);
	});

	it('greys out /skill while no source offers skills', () => {
		const skill = (hasSkills: boolean) =>
			getChatCommands({ ...OPTIONS, hasSkills: () => hasSkills }).find(
				(command) => command.name === 'skill'
			);

		expect(skill(true)?.disabled).toBe(false);
		expect(skill(false)?.disabled).toBe(true);
	});

	it('sorts a command with an order below zero right after /prompt and /skill, before the other built-in ones', () => {
		expect(names([makeCommand({ name: 'early', order: -1 })])).toEqual([
			'prompt',
			'skill',
			'early',
			'cwd',
			'model',
			'compact',
			'system-message'
		]);
	});

	it('sorts a command without an order after the built-in ones', () => {
		expect(names([makeCommand()])).toEqual([
			'prompt',
			'skill',
			'cwd',
			'model',
			'compact',
			'system-message',
			'extra'
		]);
	});

	it('sorts contributed commands among themselves by order', () => {
		const contributed = [
			makeCommand({ name: 'last', order: 5 }),
			makeCommand({ name: 'second', order: -1 }),
			makeCommand({ name: 'after', order: 0 }),
			makeCommand({ name: 'first', order: -2 })
		];

		expect(names(contributed)).toEqual([
			'prompt',
			'skill',
			'first',
			'second',
			'cwd',
			'model',
			'compact',
			'system-message',
			'after',
			'last'
		]);
	});

	it('keeps a command that is not enabled in the list, disabled', () => {
		let enabled = false;

		const contributed = [makeCommand({ isEnabled: () => enabled })];

		expect(getChatCommands(OPTIONS, contributed).at(-1)?.disabled).toBe(true);

		enabled = true;

		expect(getChatCommands(OPTIONS, contributed).at(-1)?.disabled).toBe(false);
	});

	it('carries what a contributed command shows and does', () => {
		const run = vi.fn();
		// right after /prompt and /skill
		const [, , command] = getChatCommands(OPTIONS, [
			makeCommand({ keywords: ['more'], order: -1, run })
		]);
		const composer = {} as ComposerHandle;

		if (!('run' in command)) throw new Error('not a contributed command');

		command.run(composer, ' args ');

		expect(command).toMatchObject({
			description: 'A contributed command',
			keywords: ['more'],
			name: 'extra'
		});
		expect(run).toHaveBeenCalledWith(composer, ' args ');
	});
});
