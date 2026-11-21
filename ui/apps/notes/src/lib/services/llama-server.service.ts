import { errorFromResponse } from './api.ts';
import { API } from '#lib/constants/index.ts';
import type { ModelsList, ServerProps } from '#lib/types/api.ts';

async function getJson<T>(url: string): Promise<T> {
	const response = await fetch(url);

	if (!response.ok) throw await errorFromResponse(response);

	return response.json();
}

/**
 * Reads llama-server's `/props`, for one model when it routes between several.
 * It never loads a model: props of one that is not loaded fail.
 */
export function fetchProps(model?: string): Promise<ServerProps> {
	const params = new URLSearchParams({ autoload: 'false' });

	if (model) params.set('model', model);

	return getJson<ServerProps>(`${API.PROPS}?${params}`);
}

export async function fetchModelIds(): Promise<string[]> {
	const list = await getJson<ModelsList>(API.MODELS);

	return list.data.map((model) => model.id);
}
