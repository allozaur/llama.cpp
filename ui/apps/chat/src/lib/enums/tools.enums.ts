export enum ToolSource {
	BROWSER = 'browser',
	CUSTOM = 'custom',
	MCP = 'mcp',
	SERVER = 'server'
}

/** The `type` of a tool in llama-server's `/tools` listing. */
export enum ServerToolType {
	/** A tool of one of the MCP servers llama-server runs, from `--mcp-servers-config` */
	MCP = 'mcp',
	SERVER = 'server'
}

export enum ToolPermissionDecision {
	/** Always, everywhere. */
	ALWAYS = 'always',
	/** Always, in the conversation's working folder. */
	ALWAYS_HERE = 'always_here',
	/** Every tool of the same server, always. */
	ALWAYS_SERVER = 'always_server',
	DENY = 'deny',
	ONCE = 'once',
	/** For the rest of this conversation, until the app reloads. */
	SESSION = 'session'
}

/** How tool definitions reach the model. */
export enum ToolLoadingMode {
	/** On demand once the definitions take a large share of the context. */
	AUTO = 'auto',
	/** MCP and custom tools as a list to load from, always. */
	ON_DEMAND = 'on_demand',
	/** Every enabled tool in every request. */
	UP_FRONT = 'up_front'
}

export enum ToolResponseField {
	ERROR = 'error',
	PLAIN_TEXT = 'plain_text_response'
}

/**
 * Entry types accepted by the `file_glob_search` tool's `type` parameter.
 * Mirrors the server-side validation in server-tools.cpp.
 */
export enum GlobSearchType {
	ALL = 'all',
	DIR = 'dir',
	FILE = 'file'
}

/**
 * Wire-format identifiers for server and browser tools. The string
 * value matches what the model emits in tool call names, so comparing
 * against `BuiltInTool.SERVER_READ_FILE` is equivalent to comparing
 * against the raw `'read_file'` literal - the enum just keeps the two in
 * lock-step and gives TypeScript a single source of truth for autocomplete
 * / rename support.
 *
 * The `SERVER_` / `BROWSER_` prefixes mirror the tool's primary source
 * (llama-server vs llama-ui). `get_info` is the exception: it is served by
 * the server, but llama-ui falls back to a browser implementation when the
 * server does not provide it, so it can surface under both categories in
 * the UI while keeping a single wire name.
 */
export enum BuiltInTool {
	BROWSER_GET_DATETIME = 'get_datetime',
	BROWSER_READ_MEDIA = 'read_media',
	BROWSER_RUN_JAVASCRIPT = 'run_javascript',
	BROWSER_SEARCH_CHATS = 'search_chats',
	SERVER_EDIT_FILE = 'edit_file',
	SERVER_EXEC_SHELL_COMMAND = 'exec_shell_command',
	SERVER_FILE_GLOB_SEARCH = 'file_glob_search',
	SERVER_GET_INFO = 'get_info',
	SERVER_GREP_SEARCH = 'grep_search',
	SERVER_READ_FILE = 'read_file',
	SERVER_SHELL_TASK = 'shell_task',
	SERVER_WRITE_FILE = 'write_file'
}

/** Wire values of the `shell_task` `action` parameter */
export enum ShellTaskAction {
	LIST = 'list',
	OUTPUT = 'output',
	STOP = 'stop'
}

/** Status of a background shell task, as llama-server reports it */
export enum BackgroundTaskStatus {
	EXITED = 'exited',
	RUNNING = 'running',
	STOPPED = 'stopped'
}

/** Wire values of the `search_chats` `message_selection` parameter */
export enum SearchChatsMessageSelection {
	EARLIEST = 'earliest',
	LATEST = 'latest',
	MATCHING = 'matching'
}

/** Wire values of the `search_chats` `order_timestamp` parameter */
export enum SearchChatsOrder {
	ASC = 'asc',
	DESC = 'desc'
}
