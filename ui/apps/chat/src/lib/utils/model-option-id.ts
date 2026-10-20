/**
 * Server-qualified model option ids.
 *
 * The selector lists models from every enabled server, so a bare model id can
 * collide. Option ids are qualified as `<serverId>::<rawModelId>`; selection
 * strips the prefix to find the row in the active server's list.
 */

const MODEL_OPTION_ID_SEPARATOR = '::';

/** Prefix a raw model id with the server that serves it. */
export function qualifyModelId(serverId: string, modelId: string): string {
	return `${serverId}${MODEL_OPTION_ID_SEPARATOR}${modelId}`;
}

/** Server id of a qualified model option id, or null when unqualified. */
export function serverIdFromModelId(qualifiedId: string): string | null {
	const index = qualifiedId.indexOf(MODEL_OPTION_ID_SEPARATOR);

	return index === -1 ? null : qualifiedId.slice(0, index);
}

/** Strip the server prefix from a qualified model option id. */
export function rawModelId(qualifiedId: string): string {
	const index = qualifiedId.indexOf(MODEL_OPTION_ID_SEPARATOR);

	return index === -1 ? qualifiedId : qualifiedId.slice(index + MODEL_OPTION_ID_SEPARATOR.length);
}
