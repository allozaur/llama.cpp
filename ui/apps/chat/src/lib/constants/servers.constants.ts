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
