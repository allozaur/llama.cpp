import { BACKGROUND_TASK_RESULT_REGEX } from '#lib/constants/index.ts';

/** How far from the end the background task line can sit: the marker plus its status note */
const BACKGROUND_TASK_TAIL_SCAN = 160;

export interface BackgroundTaskStart {
	taskId: number;
	/** The result without the background task line */
	output: string;
	/** The marker line as the server wrote it */
	rawText: string;
}

/**
 * The task an `exec_shell_command` result started in the background, read
 * from the `[background task: N]` line the server ends it with.
 */
export function parseBackgroundTaskStart(
	toolResult: string | undefined
): BackgroundTaskStart | undefined {
	if (!toolResult) return undefined;

	const tailStart = Math.max(0, toolResult.length - BACKGROUND_TASK_TAIL_SCAN);
	const match = toolResult.slice(tailStart).match(BACKGROUND_TASK_RESULT_REGEX);

	if (!match || match.index === undefined) return undefined;

	const lineStart = tailStart + match.index;

	return {
		output: toolResult.slice(0, lineStart),
		rawText: match[0].trim(),
		taskId: Number.parseInt(match[1], 10)
	};
}
