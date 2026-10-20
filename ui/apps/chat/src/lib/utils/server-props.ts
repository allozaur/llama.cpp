/**
 * Whether the endpoint behind a server really is a llama.cpp server.
 *
 * The UI drives llama.cpp endpoints only: it loads and unloads models, reads
 * the router's feed and its chat template. An endpoint that speaks just the
 * OpenAI API answers /v1/models happily and then breaks somewhere else, so the
 * check is made where the UI can still say no - before the server is saved.
 */

function isJsonObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Whether a /props payload is a llama.cpp one.
 *
 * Both a model and a router answer with their generation defaults; a router
 * builds its props by hand, so the role and the build string stand in for them.
 */
export function isLlamaCppProps(value: unknown): boolean {
	if (!isJsonObject(value)) return false;

	if (isJsonObject(value.default_generation_settings)) return true;

	return typeof value.role === 'string' && typeof value.build_info === 'string';
}
