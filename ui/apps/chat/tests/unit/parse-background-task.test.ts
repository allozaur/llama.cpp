import { parseBackgroundTaskStart } from '#lib/utils/index.ts';
import { describe, expect, it } from 'vitest';

describe('parseBackgroundTaskStart', () => {
	it('ignores results without a background task line', () => {
		expect(parseBackgroundTaskStart(undefined)).toBeUndefined();
		expect(parseBackgroundTaskStart('hello\n[exit code: 0]')).toBeUndefined();
	});

	it('reads a running task and strips its line', () => {
		expect(
			parseBackgroundTaskStart(
				'  VITE ready\n[background task: 4] [running; read its output with shell_task, or stop it]'
			)
		).toEqual({
			output: '  VITE ready\n',
			rawText: '[background task: 4] [running; read its output with shell_task, or stop it]',
			taskId: 4
		});
	});

	it('reads a task that already exited', () => {
		const start = parseBackgroundTaskStart('oops\n[background task: 12] [exit code: 1]');

		expect(start?.taskId).toBe(12);
		expect(start?.output).toBe('oops\n');
	});

	it('does not match the marker in the middle of the output', () => {
		expect(parseBackgroundTaskStart('[background task: 3]\nmore output')).toBeUndefined();
	});
});
