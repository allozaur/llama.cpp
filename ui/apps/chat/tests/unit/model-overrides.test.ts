// Guards what the Models page's configuration pane saves per model and sends on load: the
// arguments a load override becomes, and the saved overrides surviving a reload.

import {
	isCustomized,
	loadExtraArgs,
	loadOverrides,
	type ModelOverrideMap,
	saveOverrides
} from '#lib/components/app/models/ModelsManager/utils.ts';
import { MODEL_OVERRIDES_LOCALSTORAGE_KEY } from '#lib/constants/index.ts';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

// the node env has no DOM: a minimal localStorage backed by a Map
beforeAll(() => {
	const store = new Map<string, string>();
	const polyfill: Storage = {
		clear: () => store.clear(),
		getItem: (key) => (store.has(key) ? store.get(key)! : null),
		key: (index) => Array.from(store.keys())[index] ?? null,
		get length() {
			return store.size;
		},
		removeItem: (key) => {
			store.delete(key);
		},
		setItem: (key, value) => {
			store.set(key, String(value));
		}
	};

	(globalThis as unknown as { localStorage: Storage }).localStorage = polyfill;
});

beforeEach(() => {
	localStorage.clear();
});

describe('loadExtraArgs', () => {
	it('sends nothing for a model with no load settings', () => {
		expect(loadExtraArgs()).toEqual([]);
		expect(loadExtraArgs({ sampling: { temperature: 0.2 } })).toEqual([]);
		expect(loadExtraArgs({ load: {} })).toEqual([]);
	});

	it('turns each load setting into its llama-server argument', () => {
		expect(
			loadExtraArgs({
				load: {
					batchSize: 512,
					contextLength: 8192,
					cpuThreads: 6,
					flashAttention: true,
					gpuOffload: 0,
					keepInMemory: false,
					ubatchSize: 128,
					useMmap: false
				}
			})
		).toEqual([
			'--ctx-size',
			'8192',
			'--n-gpu-layers',
			'0',
			'--threads',
			'6',
			'--batch-size',
			'512',
			'--ubatch-size',
			'128',
			'--flash-attn',
			'on',
			'--no-mmap',
			'--no-kv-offload'
		]);
	});

	it('leaves the defaults alone', () => {
		expect(
			loadExtraArgs({ load: { flashAttention: false, keepInMemory: true, useMmap: true } })
		).toEqual([]);
	});
});

describe('model overrides', () => {
	it('count as customized only when something was saved', () => {
		expect(isCustomized()).toBe(false);
		expect(isCustomized({})).toBe(false);
		expect(isCustomized({ systemPrompt: 'Be brief.' })).toBe(true);
	});

	it('are read back as they were saved', () => {
		const overrides: ModelOverrideMap = {
			'org/Model-GGUF:Q4_K_M': { load: { contextLength: 4096 }, sampling: { topK: 40 } }
		};

		saveOverrides(overrides);

		expect(localStorage.getItem(MODEL_OVERRIDES_LOCALSTORAGE_KEY)).not.toBeNull();
		expect(loadOverrides()).toEqual(overrides);
	});

	it('start empty when nothing, or something unreadable, is stored', () => {
		expect(loadOverrides()).toEqual({});

		localStorage.setItem(MODEL_OVERRIDES_LOCALSTORAGE_KEY, '{not json');

		expect(loadOverrides()).toEqual({});
	});
});
