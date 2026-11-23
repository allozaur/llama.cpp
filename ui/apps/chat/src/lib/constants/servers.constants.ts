/** Prefix for generated ids of user-added servers. */
export const SERVER_ID_PREFIX = 'server';

/** Chat completions path every server serves. */
export const DEFAULT_SERVER_CHAT_PATH = '/v1/chat/completions';

/** Models listing path every server serves. */
export const DEFAULT_SERVER_MODELS_PATH = '/v1/models';

/** Id of the built-in backend that points at the server serving this UI. */
export const LOCAL_BACKEND_ID = 'local';

/** Favicon extract keyed by domain, for servers with no bundled mark. */
export const FAVICON_SERVICE_URL = 'https://www.google.com/s2/favicons?domain=';

/**
 * File next to index.html listing servers the app adds on startup, as
 * `{ "servers": [{ "url": "http://127.0.0.1:9931" }] }`. `llama-chat --server`
 * serves it, and `llama-chat build --server` writes it.
 */
export const PRESET_SERVERS_FILE = 'llama-chat.json';

/**
 * Name of the meta tag in index.html that says {@link PRESET_SERVERS_FILE} is
 * there: pages served any other way, such as by llama-server, never ask for it.
 */
export const PRESET_SERVERS_META = 'llama-chat-servers';

/**
 * Where llama-server listens by default on this computer. A page with no
 * server of its own, such as a static build on another host, tries it first.
 */
export const DEFAULT_SERVER_URL = 'http://localhost:9931';

/** Opens the Llama app, which registers the `llama://` scheme and runs llama-server on {@link DEFAULT_SERVER_URL}. */
export const LLAMA_APP_LAUNCH_URL = 'llama://open';

/** Where the Llama app is downloaded. */
export const LLAMA_APP_DOWNLOAD_URL = 'https://llama.app';

/** Starts llama-server on its default port. */
export const LLAMA_SERVE_COMMAND = 'llama serve';
