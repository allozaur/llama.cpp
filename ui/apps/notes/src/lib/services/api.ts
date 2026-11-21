import type { ApiErrorBody } from '#lib/types/api.ts';

export const JSON_HEADERS = { 'Content-Type': 'application/json' };

/** The error llama-server put in a failed response, or its HTTP status. */
export async function errorFromResponse(response: Response): Promise<Error> {
	try {
		const body: ApiErrorBody = await response.json();

		if (body.error?.message) return new Error(body.error.message);
	} catch {
		// not JSON: fall back to the status
	}

	return new Error(`Server error (${response.status} ${response.statusText})`.trim());
}
