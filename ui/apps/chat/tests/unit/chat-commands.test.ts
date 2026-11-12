// The `/` picker lists the built-in commands with the ones extensions
// contribute around them; without contributions only the built-in ones remain.

import type { ComposerCommand, ComposerHandle } from '$lib/extensions';
import { getChatCommands } from '$lib/utils/chat-commands';
import type { Component } from 'svelte';
import { describe, expect, it, vi } from 'vitest';

const OPTIONS = { canCompact: () => true, hasCwdTools: () => true, showModelSelector: true };
const icon = (() => {}) as unknown as Component;

function makeCommand(overrides: Partial<ComposerCommand> = {}): ComposerCommand {
	return {
		description: 'A contributed command',
		icon,
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
		expect(names()).toEqual(['cwd', 'model', 'compact']);
		expect(names([])).toEqual(['cwd', 'model', 'compact']);
	});

	it('sorts a command with an order below zero before the built-in ones', () => {
		expect(names([makeCommand({ name: 'prompt', order: -1 })])).toEqual([
			'prompt',
			'cwd',
			'model',
			'compact'
		]);
	});

	it('sorts a command without an order after the built-in ones', () => {
		expect(names([makeCommand()])).toEqual(['cwd', 'model', 'compact', 'extra']);
	});

	it('sorts contributed commands among themselves by order', () => {
		const contributed = [
			makeCommand({ name: 'last', order: 5 }),
			makeCommand({ name: 'second', order: -1 }),
			makeCommand({ name: 'after', order: 0 }),
			makeCommand({ name: 'first', order: -2 })
		];

		expect(names(contributed)).toEqual([
			'first',
			'second',
			'cwd',
			'model',
			'compact',
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
		const [command] = getChatCommands(OPTIONS, [
			makeCommand({ keywords: ['more'], order: -1, run })
		]);
		const composer = {} as ComposerHandle;

		if (!('run' in command)) throw new Error('not a contributed command');

		command.run(composer, ' args ');

		expect(command).toMatchObject({
			description: 'A contributed command',
			icon,
			keywords: ['more'],
			name: 'extra'
		});
		expect(run).toHaveBeenCalledWith(composer, ' args ');
	});
});
