/**
 * BackgroundTasksService - Stateless client of llama-server's `shell_task` tool
 *
 * Lists the shell commands exec_shell_command started in the background,
 * reads their output and stops them. No reactive state; consumed by
 * backgroundTasksStore.
 */

import { BuiltInTool, ShellTaskAction, ToolResponseField } from '#lib/enums/index.ts';
import { ToolsService } from '#lib/services/tools.service.ts';
import type { ShellTaskInfo, ShellTaskOutput } from '#lib/types/index.ts';

async function callShellTask<T>(params: Record<string, unknown>, signal?: AbortSignal): Promise<T> {
	const result = await ToolsService.executeToolRaw(BuiltInTool.SERVER_SHELL_TASK, params, signal);

	if (ToolResponseField.ERROR in result) {
		throw new Error(String(result[ToolResponseField.ERROR]));
	}

	return result as T;
}

export class BackgroundTasksService {
	/** Every task the server knows, newest first. */
	static async list(signal?: AbortSignal): Promise<ShellTaskInfo[]> {
		const result = await callShellTask<{ tasks?: ShellTaskInfo[] }>(
			{ action: ShellTaskAction.LIST },
			signal
		);

		return Array.isArray(result.tasks) ? result.tasks : [];
	}

	/** A task's output from `offset` on; the newest `maxBytes` when there is more. */
	static output(
		taskId: number,
		offset: number,
		maxBytes: number,
		signal?: AbortSignal
	): Promise<ShellTaskOutput> {
		return callShellTask<ShellTaskOutput>(
			{ action: ShellTaskAction.OUTPUT, max_output_size: maxBytes, offset, task_id: taskId },
			signal
		);
	}

	/** Stop a task and every process it started; resolves once it has ended. */
	static stop(taskId: number): Promise<ShellTaskInfo> {
		return callShellTask<ShellTaskInfo>({ action: ShellTaskAction.STOP, task_id: taskId });
	}
}
