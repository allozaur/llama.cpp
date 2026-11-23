/**
 * HfTracesService - Stateless Hugging Face Hub calls for sharing traces
 *
 * Checks an access token, creates the dataset and commits a trace file to it.
 * Reference: https://huggingface.co/docs/hub/api
 */

import {
	HF_API_CREATE_REPO_URL,
	HF_API_DATASETS_URL,
	HF_API_WHOAMI_URL,
	HF_COMMIT_CONTENT_TYPE,
	HF_DATASETS_LIST_LIMIT,
	HF_DATASETS_URL,
	HF_HTTP_FORBIDDEN,
	HF_HTTP_NOT_FOUND,
	HF_HTTP_UNAUTHORIZED,
	HF_PREUPLOAD_SAMPLE_BYTES,
	HF_REGULAR_FILE_MAX_BYTES,
	HF_REPO_TYPE_DATASET,
	HF_TRACES_REVISION,
	HF_UPLOAD_MODE_LFS
} from '#lib/constants/index.ts';
import type { HfDataset, HfTraceUpload, HfUser } from '#lib/types/index.ts';

const BASE64_CHUNK = 0x8000;

function toBase64(bytes: Uint8Array): string {
	let binary = '';

	for (let i = 0; i < bytes.length; i += BASE64_CHUNK) {
		binary += String.fromCharCode(...bytes.subarray(i, i + BASE64_CHUNK));
	}

	return btoa(binary);
}

function authHeaders(token: string): Record<string, string> {
	return { Authorization: `Bearer ${token}` };
}

/** Throws with the Hub's own error text when it gives one. */
async function ensureOk(response: Response, action: string): Promise<void> {
	if (response.ok) return;

	let detail = response.statusText;

	try {
		const body = await response.json();

		if (typeof body?.error === 'string') detail = body.error;
	} catch {
		// not JSON; keep the status text
	}

	throw new Error(`${action} failed (${response.status}): ${detail}`);
}

/**
 * A sign-in with Hugging Face reaches only the datasets the app created, so the Hub
 * turns down a share to any other dataset.
 */
function ensureWritable(response: Response, repoId: string): void {
	if (response.status !== HF_HTTP_FORBIDDEN) return;

	throw new Error(
		`You cannot add traces to ${repoId}. Signing in with Hugging Face lets the app write only to datasets it created: pick a new dataset name, or sign in with an access token that has write access.`
	);
}

export class HfTracesService {
	/** Creates the dataset unless it already exists; an existing one keeps its visibility. */
	static async ensureDataset(token: string, repoId: string, isPrivate: boolean): Promise<void> {
		const existing = await fetch(`${HF_API_DATASETS_URL}/${repoId}`, {
			headers: authHeaders(token)
		});

		if (existing.ok) return;

		if (existing.status !== HF_HTTP_NOT_FOUND) await ensureOk(existing, 'Dataset lookup');

		const [organization, name] = repoId.split('/');
		const response = await fetch(HF_API_CREATE_REPO_URL, {
			body: JSON.stringify({ name, organization, private: isPrivate, type: HF_REPO_TYPE_DATASET }),
			headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
			method: 'POST'
		});

		await ensureOk(response, 'Dataset creation');
	}

	/**
	 * Lists the datasets of an account, most recently changed first; the token
	 * brings in the private ones it may read.
	 */
	static async listDatasets(token: string, author: string): Promise<HfDataset[]> {
		const url = new URL(HF_API_DATASETS_URL);

		url.searchParams.set('author', author);
		url.searchParams.set('sort', 'lastModified');
		url.searchParams.set('direction', '-1');
		url.searchParams.set('limit', String(HF_DATASETS_LIST_LIMIT));

		const response = await fetch(url, { headers: authHeaders(token) });

		await ensureOk(response, 'Dataset list');

		const body: unknown = await response.json();

		if (!Array.isArray(body)) return [];

		return body
			.filter((dataset) => typeof dataset?.id === 'string')
			.map((dataset) => ({ id: dataset.id, isPrivate: dataset.private === true }));
	}

	/**
	 * Commits one trace file to a dataset, creating the dataset first when needed.
	 * @returns The URL of the file on the Hub
	 */
	static async uploadTrace(token: string, upload: HfTraceUpload): Promise<string> {
		const { commitMessage, content, isPrivate, path, repoId } = upload;
		const bytes = new TextEncoder().encode(content);

		if (bytes.length > HF_REGULAR_FILE_MAX_BYTES) {
			throw new Error(
				'This trace is too large to share. Leave attachments out or share fewer messages.'
			);
		}

		await HfTracesService.ensureDataset(token, repoId, isPrivate);

		const repoApi = `${HF_API_DATASETS_URL}/${repoId}`;
		// a dataset whose .gitattributes sends .jsonl to LFS needs an upload this share does not do
		const preupload = await fetch(`${repoApi}/preupload/${HF_TRACES_REVISION}`, {
			body: JSON.stringify({
				files: [
					{
						path,
						sample: toBase64(bytes.subarray(0, HF_PREUPLOAD_SAMPLE_BYTES)),
						size: bytes.length
					}
				]
			}),
			headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
			method: 'POST'
		});

		ensureWritable(preupload, repoId);
		await ensureOk(preupload, 'Upload check');

		const { files } = await preupload.json();

		if (files?.[0]?.uploadMode === HF_UPLOAD_MODE_LFS) {
			throw new Error(
				`${repoId} stores .jsonl files with LFS, which sharing does not support yet.`
			);
		}

		const body = [
			{ key: 'header', value: { description: '', summary: commitMessage } },
			{ key: 'file', value: { content: toBase64(bytes), encoding: 'base64', path } }
		]
			.map((line) => JSON.stringify(line))
			.join('\n');
		const commit = await fetch(`${repoApi}/commit/${HF_TRACES_REVISION}`, {
			body,
			headers: { ...authHeaders(token), 'Content-Type': HF_COMMIT_CONTENT_TYPE },
			method: 'POST'
		});

		ensureWritable(commit, repoId);
		await ensureOk(commit, 'Upload');

		return `${HF_DATASETS_URL}/${repoId}/blob/${HF_TRACES_REVISION}/${encodeURIComponent(path)}`;
	}

	/**
	 * Reads the account a token belongs to.
	 * @throws When the token is wrong or expired
	 */
	static async whoAmI(token: string): Promise<HfUser> {
		const response = await fetch(HF_API_WHOAMI_URL, { headers: authHeaders(token) });

		if (response.status === HF_HTTP_UNAUTHORIZED) {
			throw new Error('Hugging Face did not accept this token. Check it and try again.');
		}

		await ensureOk(response, 'Sign in');

		const body = await response.json();

		return {
			fullname: body.fullname,
			name: body.name,
			tokenRole: body.auth?.accessToken?.role
		};
	}
}
