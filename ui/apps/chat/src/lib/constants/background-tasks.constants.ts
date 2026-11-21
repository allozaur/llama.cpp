import { STORAGE_APP_NAME } from './storage.constants';

/** How often the task list is read while a task runs */
export const BACKGROUND_TASKS_POLL_MS = 2000;

/** How often an open task's output is read while it runs */
export const BACKGROUND_TASK_OUTPUT_POLL_MS = 1000;

/** Bytes asked for in one output read, the server's per-task buffer */
export const BACKGROUND_TASK_OUTPUT_READ_BYTES = 256 * 1024;

/** Characters of output kept per task in the browser; older output is dropped at a line start */
export const BACKGROUND_TASK_OUTPUT_MAX_CHARS = 256 * 1024;

/** Which conversation started which task, kept across reloads */
export const BACKGROUND_TASK_CONVERSATIONS_LOCALSTORAGE_KEY = `${STORAGE_APP_NAME}.backgroundTaskConversations`;

/** The line exec_shell_command ends a background start with */
export const BACKGROUND_TASK_RESULT_REGEX = /\[background task: (\d+)\](?: \[[^\]\n]*\])?\s*$/;
