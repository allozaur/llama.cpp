import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('#lib/services/background-tasks.service.ts', () => ({
	BackgroundTasksService: { list: vi.fn(), output: vi.fn(), stop: vi.fn() }
}));

import { BackgroundTaskStatus } from '#lib/enums/index.ts';
import { BackgroundTasksService } from '#lib/services/background-tasks.service.ts';
import { backgroundTasksStore, trimTaskOutput } from '#lib/stores/background-tasks.svelte.ts';
import type { ShellTaskInfo } from '#lib/types/index.ts';

const list = vi.mocked(BackgroundTasksService.list);
const output = vi.mocked(BackgroundTasksService.output);
const stop = vi.mocked(BackgroundTasksService.stop);

function info(overrides: Partial<ShellTaskInfo> = {}): ShellTaskInfo {
	return {
		command: 'npm run dev',
		cwd: '/work',
		ended_at: null,
		exit_code: null,
		output_size: 10,
		started_at: 1000,
		status: BackgroundTaskStatus.RUNNING,
		task_id: 1,
		...overrides
	};
}

beforeEach(() => {
	list.mockReset();
	output.mockReset();
	stop.mockReset();
});

describe('backgroundTasksStore', () => {
	it('shows a started task at once, then keys it by the server list', async () => {
		list.mockResolvedValueOnce([info()]);

		backgroundTasksStore.track({
			command: 'npm run dev',
			conversationId: 'conv-1',
			cwd: '/work',
			output: 'ready\n',
			taskId: 1
		});

		expect(backgroundTasksStore.tasks[0]).toMatchObject({
			conversationId: 'conv-1',
			key: 'pending-1',
			output: 'ready\n'
		});

		await backgroundTasksStore.refresh();

		expect(backgroundTasksStore.tasks).toHaveLength(1);
		expect(backgroundTasksStore.tasks[0]).toMatchObject({
			conversationId: 'conv-1',
			key: '1000-1',
			output: 'ready\n',
			status: BackgroundTaskStatus.RUNNING
		});
		expect(backgroundTasksStore.runningCount).toBe(1);
	});

	it('reads the open task output from where it left off', async () => {
		output.mockResolvedValueOnce({
			...info(),
			next_offset: 12,
			offset: 0,
			output: 'ready\nline 2',
			skipped: 0
		});
		backgroundTasksStore.open('1000-1');
		await vi.waitFor(() => expect(backgroundTasksStore.openTask?.nextOffset).toBe(12));

		expect(backgroundTasksStore.openTask?.output).toBe('ready\nline 2');

		output.mockResolvedValueOnce({
			...info(),
			next_offset: 20,
			offset: 12,
			output: '\nline 3',
			skipped: 0
		});
		list.mockResolvedValueOnce([info()]);
		await backgroundTasksStore.refresh();

		expect(output).toHaveBeenLastCalledWith(1, 12, expect.any(Number));
		expect(backgroundTasksStore.openTask?.output).toBe('ready\nline 2\nline 3');
	});

	it('stops a task and keeps its output', async () => {
		stop.mockResolvedValueOnce(
			info({ ended_at: 5000, exit_code: 143, status: BackgroundTaskStatus.STOPPED })
		);
		output.mockResolvedValueOnce({
			...info({ ended_at: 5000, exit_code: 143, status: BackgroundTaskStatus.STOPPED }),
			next_offset: 20,
			offset: 20,
			output: '',
			skipped: 0
		});

		await backgroundTasksStore.stop('1000-1');

		expect(stop).toHaveBeenCalledWith(1);
		expect(backgroundTasksStore.openTask).toMatchObject({
			exitCode: 143,
			output: 'ready\nline 2\nline 3',
			status: BackgroundTaskStatus.STOPPED
		});
		expect(backgroundTasksStore.runningCount).toBe(0);
	});

	it('drops tasks the server no longer knows, and hides cleared ones', async () => {
		list.mockResolvedValueOnce([
			info({ started_at: 9000, task_id: 1 }),
			info({ exit_code: 0, started_at: 8000, status: BackgroundTaskStatus.EXITED, task_id: 2 })
		]);
		await backgroundTasksStore.refresh();

		expect(backgroundTasksStore.tasks.map((t) => t.key)).toEqual(['9000-1', '8000-2']);
		expect(backgroundTasksStore.openTask).toBeNull();

		backgroundTasksStore.clearFinished();

		expect(backgroundTasksStore.tasks.map((t) => t.key)).toEqual(['9000-1']);
	});
});

describe('trimTaskOutput', () => {
	it('keeps short output as it is', () => {
		expect(trimTaskOutput('abc', 10)).toBe('abc');
	});

	it('cuts long output at a line start', () => {
		expect(trimTaskOutput('line one\nline two\nline three', 15)).toBe('line three');
	});
});
