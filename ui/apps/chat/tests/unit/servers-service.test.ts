// Guards the two questions a connectivity check answers: does the server serve
// models, and is it a llama.cpp server at all. The UI drives llama.cpp
// endpoints only, and an endpoint that speaks just the OpenAI API answers the
// listing happily, so the second question is what keeps it out.

import { ServersService } from '$lib/services/servers.service';
import { createUrlServer } from '$lib/utils/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

const SERVER = createUrlServer('https://example.com', 'u1', 'Office');
const MODELS = JSON.stringify({ data: [{ id: 'qwen.gguf' }], object: 'list' });
const PROPS = JSON.stringify({
	default_generation_settings: { n_ctx: 4096, params: {} },
	model_path: '/models/qwen.gguf',
	role: 'model'
});

/** Serve the two endpoints a check reads, with the answers the test wants. */
function stubEndpoint(options: { props?: Response; propsBody?: string } = {}) {
	vi.stubGlobal('fetch', async (input: RequestInfo | URL) => {
		const url = String(input instanceof Request ? input.url : input);

		if (url.endsWith('/props')) {
			return options.props ?? new Response(options.propsBody ?? PROPS, { status: 200 });
		}

		return new Response(MODELS, { status: 200 });
	});
}

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('server check', () => {
	it('accepts a server that lists models and answers props', async () => {
		stubEndpoint();

		const result = await ServersService.test(SERVER);

		expect(result.ok).toBe(true);
		expect(result.modelCount).toBe(1);
	});

	it('refuses an endpoint that is not a llama.cpp server', async () => {
		stubEndpoint({ propsBody: JSON.stringify({ data: [], object: 'list' }) });

		const result = await ServersService.test(SERVER);

		expect(result.ok).toBe(false);
		expect(result.error).toMatch(/not a llama\.cpp server/);
	});

	it('keeps an endpoint whose props cannot be read', async () => {
		// a reverse proxy that hides /props is not proof of a foreign server
		stubEndpoint({ props: new Response('Not Found', { status: 404 }) });

		const result = await ServersService.test(SERVER);

		expect(result.ok).toBe(true);
	});
});

describe('server probe', () => {
	it('reports a key-protected endpoint as wanting one, and knows nothing else', async () => {
		stubEndpoint({ props: new Response('Unauthorized', { status: 401 }) });

		expect(await ServersService.probe(SERVER)).toEqual({ authRequired: true, llamaCpp: null });
	});

	it('reports what the endpoint is when props answer', async () => {
		stubEndpoint();

		expect(await ServersService.probe(SERVER)).toEqual({ authRequired: false, llamaCpp: true });
	});

	it('reports nothing for an endpoint that does not answer', async () => {
		vi.stubGlobal('fetch', async () => {
			throw new Error('Failed to fetch');
		});

		expect(await ServersService.probe(SERVER)).toEqual({ authRequired: false, llamaCpp: null });
	});
});
