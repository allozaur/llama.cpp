import { StorageConflictError } from './storage-conflict-error';
import { API_KEY_LOCALSTORAGE_KEY, API_STORAGE, HEADERS, LOCAL_BACKEND_ID } from '$lib/constants';
import { PreferencesService } from '$lib/services/preferences.service';
import type {
	DatabaseRecordKind,
	DatabaseRecords,
	StorageAdapter,
	StorageAdapterDefinition,
	StoredConversation
} from '$lib/types';
import { ApiError, apiFetch } from '$lib/utils/api-fetch';

/**
 * LlamaServerStorageAdapter - the server's /storage routes (--ui-storage)
 *
 * The server keeps one JSON file per conversation and answers a stale write
 * with 409. Requests always go to the server serving this UI, whichever server
 * chats target, and carry the API key kept in this browser, since the settings
 * that normally carry it are themselves loaded from the server.
 */
export class LlamaServerStorageAdapter implements StorageAdapter {
	async deleteConversation(id: string): Promise<void> {
		await this.request(`${API_STORAGE.CONVERSATIONS}/${encodeURIComponent(id)}`, {
			method: 'DELETE'
		});
	}

	async getConversation(id: string): Promise<StoredConversation | null> {
		try {
			return await this.request<StoredConversation>(
				`${API_STORAGE.CONVERSATIONS}/${encodeURIComponent(id)}`
			);
		} catch (error) {
			if (error instanceof ApiError && error.status === 404) return null;

			throw error;
		}
	}

	async getSettings(): Promise<Record<string, string>> {
		return await this.request(API_STORAGE.SETTINGS);
	}

	async listConversations(): Promise<Pick<StoredConversation, 'rev' | 'conv'>[]> {
		return await this.request(API_STORAGE.CONVERSATIONS);
	}

	async listRecords<K extends DatabaseRecordKind>(kind: K): Promise<DatabaseRecords[K][]> {
		const records = await this.request<Record<string, DatabaseRecords[K]>>(
			`${API_STORAGE.RECORDS}/${encodeURIComponent(kind)}`
		);

		return Object.values(records);
	}

	async putConversation(doc: StoredConversation): Promise<number> {
		try {
			const { rev } = await this.request<{ rev: number }>(
				`${API_STORAGE.CONVERSATIONS}/${encodeURIComponent(doc.conv.id)}`,
				{ body: JSON.stringify(doc), method: 'POST' }
			);

			return rev;
		} catch (error) {
			if (error instanceof ApiError && error.status === 409) {
				throw new StorageConflictError(doc.conv.id);
			}

			throw error;
		}
	}

	async updateRecords<K extends DatabaseRecordKind>(
		kind: K,
		set: DatabaseRecords[K][],
		remove: string[]
	): Promise<void> {
		await this.request(`${API_STORAGE.RECORDS}/${encodeURIComponent(kind)}`, {
			body: JSON.stringify({ remove, set: Object.fromEntries(set.map((r) => [r.id, r])) }),
			method: 'POST'
		});
	}

	async updateSettings(set: Record<string, string>, remove: string[]): Promise<void> {
		await this.request(API_STORAGE.SETTINGS, {
			body: JSON.stringify({ remove, set }),
			method: 'POST'
		});
	}

	private authHeaders(): Record<string, string> {
		let apiKey: string | null = null;

		try {
			apiKey = PreferencesService.getItem(API_KEY_LOCALSTORAGE_KEY)?.trim() || null;
		} catch {
			// storage disabled, fall back to the settings store's key
		}

		return apiKey ? { [HEADERS.AUTHORIZATION]: `${HEADERS.BEARER}${apiKey}` } : {};
	}

	private async request<T>(
		path: string,
		init: { body?: string; method?: string } = {}
	): Promise<T> {
		return await apiFetch<T>(path, {
			...init,
			headers: this.authHeaders(),
			serverId: LOCAL_BACKEND_ID
		});
	}
}

export const llamaServerStorageAdapter: StorageAdapterDefinition = {
	create: () => new LlamaServerStorageAdapter(),
	description:
		"Keep conversations and settings on the server's disk, so they survive clearing browser data and are shared by every browser and port that opens this server. Anyone who can reach the server can read them.",
	id: 'llama-server',
	isAvailable: (props) => props?.ui_storage === true,
	name: 'llama-server'
};
