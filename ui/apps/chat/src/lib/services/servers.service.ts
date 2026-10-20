/**
 * ServersService - Stateless server connectivity checks and model listing
 *
 * Probes a server's models endpoint to validate its URL and credentials, and
 * normalizes the response into the UI model shape. No reactive state;
 * consumed by the servers settings UI and the per-server model cache.
 */

import { API_MODELS, LOCAL_BACKEND_ID } from '$lib/constants';
import { ModelsService } from '$lib/services/models.service';
import type { ApiModelsListResponse, ModelOption, Server } from '$lib/types';
import { isAbortError } from '$lib/utils/abort';
import { apiUrl } from '$lib/utils/api-base';
import { getAuthHeadersForServer } from '$lib/utils/api-headers';
import {
	isLocalServer,
	isReachableServer,
	isRemoteServer,
	readModelContextLength,
	serverModelsUrl,
	serverOrigin
} from '$lib/utils/server';

/** Models returned by a server, plus the failure detail when the call fails. */
export interface ServerModelsResult {
	error?: string;
	models: ModelOption[];
	ok: boolean;
	status: number | null;
	/** Untouched list payload of the local server, kept so the router rows and their load statuses can be rebuilt without asking again. */
	raw?: ApiModelsListResponse;
}

/** What probing a server's endpoint said about it. */
export interface ServerProbe {
	/** The endpoint refused the request for want of a key, so it wants one. */
	authRequired: boolean;
}

/** Outcome of a server connectivity check. */
export interface ServerTestResult {
	error?: string;
	modelCount?: number;
	ok: boolean;
	status: number | null;
}

export class ServersService {
	/**
	 * List the models a server exposes on its models endpoint.
	 *
	 * @param server - Server to query. Does not need to be registered yet.
	 * @param signal - Optional abort signal for a cancelled request.
	 */
	static async listModels(server: Server, signal?: AbortSignal): Promise<ServerModelsResult> {
		if (!isReachableServer(server)) {
			return {
				error: isRemoteServer(server) ? 'Access code is required' : 'Server URL is required',
				models: [],
				ok: false,
				status: null
			};
		}

		// the local server has no origin of its own; its models endpoint is base
		// relative, and a remote one is answered over its tunnel
		const url = isLocalServer(server)
			? apiUrl(API_MODELS.LIST, LOCAL_BACKEND_ID)
			: serverModelsUrl(server);

		try {
			const response = await fetch(url, {
				headers: getAuthHeadersForServer(server),
				signal
			});

			if (!response.ok) {
				return {
					error: await describeFailure(response),
					models: [],
					ok: false,
					status: response.status
				};
			}

			const body = (await response.json()) as { data?: unknown };
			const entries = Array.isArray(body?.data) ? body.data : [];
			const models = entries.flatMap((entry) => normalizeServerModel(entry));
			// the local rows carry load status, external ones carry the context size
			const raw = body as ApiModelsListResponse;

			return { models, ok: true, raw, status: response.status };
		} catch (error) {
			if (isAbortError(error)) {
				return { models: [], ok: false, status: null };
			}

			return {
				error: error instanceof Error ? error.message : String(error),
				models: [],
				ok: false,
				status: null
			};
		}
	}

	/**
	 * Ask a server whether it wants an API key. A llama-server guards /props with
	 * the key it was started with, so a 401 there means the form needs one.
	 */
	static async probe(server: Server): Promise<ServerProbe> {
		// a remote server has no URL to ask about: its code is tested by opening
		// the tunnel, which is what the form's connection test does
		if (isRemoteServer(server)) return { authRequired: false };

		const base = serverOrigin(server).replace(/\/+$/, '');

		if (!base) return { authRequired: false };

		try {
			const response = await fetch(`${base}/props`, {
				headers: getAuthHeadersForServer(server),
				signal: AbortSignal.timeout(5000)
			});

			return { authRequired: response.status === 401 };
		} catch {
			return { authRequired: false };
		}
	}

	/**
	 * Check that a server answers on its models endpoint.
	 *
	 * @param server - Server to probe. Does not need to be registered yet.
	 * @param signal - Optional abort signal for a cancelled test.
	 */
	static async test(server: Server, signal?: AbortSignal): Promise<ServerTestResult> {
		const result = await ServersService.listModels(server, signal);

		return {
			error: result.error,
			modelCount: result.models.length,
			ok: result.ok,
			status: result.status
		};
	}
}

/** Build a human-readable message from a non-OK response. */
async function describeFailure(response: Response): Promise<string> {
	const status = `${response.status} ${response.statusText}`.trim();

	try {
		const body = (await response.json()) as { error?: { message?: string }; message?: string };
		const message = body?.error?.message ?? body?.message;

		if (message) return `${status}: ${message}`;
	} catch {
		// non-JSON error body, fall back to the status line
	}

	return status;
}

/**
 * Normalize one entry of an OpenAI-compatible `/v1/models` response. External
 * servers only guarantee an id, so that doubles as the display name.
 */
function normalizeServerModel(entry: unknown): ModelOption[] {
	if (!entry || typeof entry !== 'object') return [];

	const raw = entry as Record<string, unknown>;
	const id = typeof raw.id === 'string' ? raw.id.trim() : '';

	if (!id) return [];

	// a llama-compat server lists its projector and draft sidecars as models too
	if (ModelsService.isSidecarEntry(id)) return [];

	return [
		{
			capabilities: [],
			contextLength: readModelContextLength(raw),
			id,
			model: id,
			name: id,
			status: raw.status as ApiModelDataEntry['status']
		}
	];
}
