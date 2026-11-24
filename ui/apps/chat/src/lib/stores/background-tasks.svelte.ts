/**
 * backgroundTasksStore - Shell commands running in the background
 *
 * Holds every background task llama-server reports (started by
 * exec_shell_command with run_in_background): its command, working folder,
 * status, exit code and the output read so far, plus the conversation that
 * started it. Fed by the agentic loop's tool results and by polling the
 * server's `shell_task` tool while a task runs. Stopping a task needs no
 * permission: it only ends what an allowed call started.
 */

import {
	BACKGROUND_TASK_CONVERSATIONS_LOCALSTORAGE_KEY,
	BACKGROUND_TASK_OUTPUT_MAX_CHARS,
	BACKGROUND_TASK_OUTPUT_POLL_MS,
	BACKGROUND_TASK_OUTPUT_READ_BYTES,
	BACKGROUND_TASKS_POLL_MS
} from '#lib/constants/index.ts';
import { BackgroundTaskStatus, BuiltInTool } from '#lib/enums/index.ts';
import { BackgroundTasksService } from '#lib/services/background-tasks.service.ts';
// direct import, not via the barrel, to avoid circular deps
import { toolsStore } from '#lib/stores/tools.svelte.ts';
import type { BackgroundTask, ShellTaskInfo } from '#lib/types/index.ts';
import { browser } from '$app/env';
import { SvelteSet } from 'svelte/reactivity';

/** What the app remembers about a task across reloads, by task key. */
interface TaskMemo {
	conversationId?: string | null;
	dismissed?: boolean;
}

export function backgroundTaskKey(info: Pick<ShellTaskInfo, 'started_at' | 'task_id'>): string {
	return `${info.started_at}-${info.task_id}`;
}

/** Keep the newest `max` characters, cut at a line start when one is near. */
export function trimTaskOutput(output: string, max = BACKGROUND_TASK_OUTPUT_MAX_CHARS): string {
	if (output.length <= max) return output;

	const cut = output.length - max;
	const lineStart = output.indexOf('\n', cut);

	return lineStart >= 0 && lineStart - cut < 1024 ? output.slice(lineStart + 1) : output.slice(cut);
}

class BackgroundTasksStore {
	private _error = $state<string | null>(null);
	private _openKey = $state<string | null>(null);
	private _tasks = $state<BackgroundTask[]>([]);
	private connected = false;
	private memos: Record<string, TaskMemo> = {};
	/** Conversations of tasks a tool call started, until the list shows them, by server task id. */
	private pending = new Map<number, string | null>();
	private refreshing: Promise<void> | null = null;
	private stopping = new SvelteSet<string>();
	private timer: ReturnType<typeof setTimeout> | null = null;

	/** Whether llama-server offers background tasks. */
	get available(): boolean {
		return toolsStore.serverTools.some((t) => t.function.name === BuiltInTool.SERVER_SHELL_TASK);
	}

	get error(): string | null {
		return this._error;
	}

	get openTask(): BackgroundTask | null {
		return this._tasks.find((t) => t.key === this._openKey) ?? null;
	}

	get runningCount(): number {
		return this._tasks.filter((t) => t.status === BackgroundTaskStatus.RUNNING).length;
	}

	/** Every known task, newest first, without the ones the user cleared. */
	get tasks(): readonly BackgroundTask[] {
		return this._tasks;
	}

	/** Hide a conversation's finished tasks; the server forgets them on its own. */
	clearFinished(conversationId: string): void {
		const cleared = (t: BackgroundTask) =>
			t.conversationId === conversationId && t.status !== BackgroundTaskStatus.RUNNING;

		for (const task of this._tasks) {
			if (cleared(task)) this.remember(task.key, { dismissed: true });
		}

		this._tasks = this._tasks.filter((t) => !cleared(t));

		if (this._openKey && !this.openTask) this._openKey = null;
	}

	close(): void {
		this._openKey = null;
	}

	/** Read the tasks once the server offers them; polling follows while one runs. */
	connect(): void {
		if (!browser || this.connected || !this.available) return;

		this.connected = true;
		this.memos = loadMemos();
		void this.refresh();
	}

	/** The newest task with a server id; ids start over when llama-server restarts. */
	findById(id: number): BackgroundTask | null {
		return this._tasks.find((t) => t.id === id) ?? null;
	}

	isStopping(key: string): boolean {
		return this.stopping.has(key);
	}

	open(key: string): void {
		this._openKey = key;

		const task = this.openTask;

		if (task) void this.readOutput(task).then(() => this.schedule());
	}

	/** Open the newest task with a server id, e.g. from the tool call that started it. */
	openById(id: number): void {
		const task = this.findById(id);

		if (task) this.open(task.key);
	}

	/** Read the task list now, then keep polling while something runs. */
	refresh(): Promise<void> {
		this.refreshing ??= (async () => {
			try {
				const infos = await BackgroundTasksService.list();

				this.merge(infos);
				this._error = null;

				const open = this.openTask;

				if (open) await this.readOutput(open);
			} catch (error) {
				this._error = error instanceof Error ? error.message : String(error);
			} finally {
				this.refreshing = null;
				this.schedule();
			}
		})();

		return this.refreshing;
	}

	async stop(key: string): Promise<void> {
		const task = this._tasks.find((t) => t.key === key);

		if (!task || task.status !== BackgroundTaskStatus.RUNNING || this.stopping.has(key)) return;

		this.stopping.add(key);

		try {
			const info = await BackgroundTasksService.stop(task.id);

			this.merge([info], { partial: true });
			this._error = null;

			const updated = this._tasks.find((t) => t.key === key);

			if (updated && this._openKey === key) await this.readOutput(updated);
		} catch (error) {
			this._error = error instanceof Error ? error.message : String(error);
		} finally {
			this.stopping.delete(key);
		}
	}

	/** The tasks a conversation started, newest first. */
	tasksOf(conversationId: string): BackgroundTask[] {
		return this._tasks.filter((t) => t.conversationId === conversationId);
	}

	/** Note a task a tool call just started, so it shows at once and keeps its conversation. */
	track(start: {
		taskId: number;
		command: string;
		cwd: string;
		conversationId: string | null;
		output: string;
	}): void {
		this.pending.set(start.taskId, start.conversationId);

		// shown until the list reads its real start time and key
		const key = `pending-${start.taskId}`;

		if (
			!this._tasks.some((t) => t.id === start.taskId && t.status === BackgroundTaskStatus.RUNNING)
		) {
			this._tasks = [
				{
					command: start.command,
					conversationId: start.conversationId,
					cwd: start.cwd,
					endedAt: null,
					exitCode: null,
					id: start.taskId,
					key,
					nextOffset: 0,
					output: start.output,
					startedAt: Date.now(),
					status: BackgroundTaskStatus.RUNNING
				},
				...this._tasks
			];
		}

		this.connected = true;
		void this.refresh();
	}

	/**
	 * Fold the server's view into the kept tasks. A full list also drops the
	 * tasks the server no longer knows, e.g. after it restarted.
	 */
	private merge(infos: ShellTaskInfo[], { partial = false } = {}): void {
		const byKey = new Map(this._tasks.map((t) => [t.key, t]));
		const seen = new SvelteSet<string>();
		const merged: BackgroundTask[] = [];

		for (const info of infos) {
			const key = backgroundTaskKey(info);

			seen.add(key);

			if (this.memos[key]?.dismissed) continue;

			const placeholder = this._tasks.find((t) => t.key === `pending-${info.task_id}`);
			const existing = byKey.get(key) ?? placeholder;

			if (this.pending.has(info.task_id)) {
				this.remember(key, { conversationId: this.pending.get(info.task_id) ?? null });
				this.pending.delete(info.task_id);
			}

			merged.push({
				command: info.command,
				conversationId: existing?.conversationId ?? this.memos[key]?.conversationId ?? null,
				cwd: info.cwd,
				endedAt: info.ended_at,
				exitCode: info.exit_code,
				id: info.task_id,
				key,
				nextOffset: existing?.nextOffset ?? 0,
				output: existing?.output ?? '',
				startedAt: info.started_at,
				status: info.status
			});

			if (placeholder && this._openKey === placeholder.key) this._openKey = key;
		}

		if (partial) {
			const updated = new Map(merged.map((t) => [t.key, t]));

			this._tasks = this._tasks.map((t) => updated.get(t.key) ?? t);

			return;
		}

		// a task just started may not be listed yet: keep its placeholder
		const placeholders = this._tasks.filter(
			(t) => t.key.startsWith('pending-') && !merged.some((m) => m.id === t.id)
		);

		this._tasks = [...placeholders, ...merged];
		this.pruneMemos(seen);

		if (this._openKey && !this.openTask) this._openKey = null;
	}

	private pruneMemos(listed: SvelteSet<string>): void {
		const keys = Object.keys(this.memos).filter((k) => !listed.has(k));

		if (keys.length === 0) return;

		for (const key of keys) delete this.memos[key];

		saveMemos(this.memos);
	}

	/** Append the output the open view has not read yet. */
	private async readOutput(task: BackgroundTask): Promise<void> {
		if (task.key.startsWith('pending-')) return;

		try {
			const res = await BackgroundTasksService.output(
				task.id,
				task.nextOffset,
				BACKGROUND_TASK_OUTPUT_READ_BYTES
			);
			const current = this._tasks.find((t) => t.key === task.key);

			if (!current || res.offset < current.nextOffset) return;

			const gap = res.skipped > 0 ? `\n[... ${res.skipped} bytes not shown ...]\n` : '';
			// the tool result held the first output already: start over from the server's copy
			const base = current.nextOffset === 0 ? '' : current.output;

			current.output = trimTaskOutput(base + gap + res.output);
			current.nextOffset = res.next_offset;
			current.status = res.status;
			current.exitCode = res.exit_code;
			current.endedAt = res.ended_at;
		} catch (error) {
			this._error = error instanceof Error ? error.message : String(error);
		}
	}

	private remember(key: string, memo: TaskMemo): void {
		this.memos[key] = { ...this.memos[key], ...memo };
		saveMemos(this.memos);
	}

	private schedule(): void {
		if (this.timer) clearTimeout(this.timer);

		this.timer = null;

		if (!browser || this.runningCount === 0) return;

		const open = this.openTask;
		const delay =
			open?.status === BackgroundTaskStatus.RUNNING
				? BACKGROUND_TASK_OUTPUT_POLL_MS
				: BACKGROUND_TASKS_POLL_MS;

		this.timer = setTimeout(() => void this.refresh(), delay);
	}
}

function loadMemos(): Record<string, TaskMemo> {
	try {
		const raw = localStorage.getItem(BACKGROUND_TASK_CONVERSATIONS_LOCALSTORAGE_KEY);
		const parsed: unknown = raw ? JSON.parse(raw) : {};

		return parsed && typeof parsed === 'object' ? (parsed as Record<string, TaskMemo>) : {};
	} catch {
		return {};
	}
}

function saveMemos(memos: Record<string, TaskMemo>): void {
	if (!browser) return;

	try {
		localStorage.setItem(BACKGROUND_TASK_CONVERSATIONS_LOCALSTORAGE_KEY, JSON.stringify(memos));
	} catch {
		// storage full or blocked: the mapping lasts until reload
	}
}

export const backgroundTasksStore = new BackgroundTasksStore();
