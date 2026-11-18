import { ServerStore } from '#lib/stores/llama-server.svelte.ts';
import { afterEach, describe, expect, it, vi } from 'vitest';

function mockServer(props: object, models: string[], modelProps?: object) {
	return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
		const url = String(input);

		if (url.includes('/v1/models')) {
			return new Response(JSON.stringify({ data: models.map((id) => ({ id })) }));
		}

		if (url.includes('model=')) {
			return modelProps
				? new Response(JSON.stringify(modelProps))
				: new Response('{}', { status: 400 });
		}

		return new Response(JSON.stringify(props));
	});
}

afterEach(() => {
	vi.restoreAllMocks();
});

describe('ServerStore', () => {
	it('reads the one model of a server without routing', async () => {
		mockServer({ default_generation_settings: { n_ctx: 4096 }, model_path: '/models/tiny.gguf' }, [
			'tiny.gguf'
		]);

		const store = new ServerStore();

		await store.init();

		expect(store.isRouter).toBe(false);
		expect(store.canGenerate).toBe(true);
		expect(store.contextSize).toBe(4096);
		expect(store.modelName).toBe('tiny.gguf');
		expect(store.requestModel).toBeUndefined();
	});

	it('needs a model picked on a routing server', async () => {
		const fetchMock = mockServer({ role: 'router' }, ['a.gguf', 'b.gguf'], {
			default_generation_settings: { n_ctx: 8192 }
		});
		const store = new ServerStore();

		await store.init();

		expect(store.isRouter).toBe(true);
		expect(store.canGenerate).toBe(false);
		expect(store.contextSize).toBeNull();

		await store.selectModel('b.gguf');

		expect(store.canGenerate).toBe(true);
		expect(store.requestModel).toBe('b.gguf');
		expect(store.contextSize).toBe(8192);
		// props of a model are read without loading it
		expect(String(fetchMock.mock.calls.at(-1)?.[0])).toContain('autoload=false');
	});

	it('leaves the context size unknown while the picked model is not loaded', async () => {
		mockServer({ role: 'router' }, ['a.gguf']);

		const store = new ServerStore();

		await store.init();
		await store.selectModel('a.gguf');

		expect(store.contextSize).toBeNull();
	});

	it('reports a server it cannot reach', async () => {
		vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));

		const store = new ServerStore();

		await store.init();

		expect(store.error).toBe('Failed to fetch');
		expect(store.canGenerate).toBe(false);
	});
});
