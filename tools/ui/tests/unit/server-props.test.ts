// Guards the one question that keeps a foreign endpoint out of the servers
// list: does /props answer like a llama.cpp server? A negative that is only a
// guess would lock a working server out of the UI, so "unknown" stays unknown.

import { isLlamaCppProps } from '$lib/utils/server-props';
import { describe, expect, it } from 'vitest';

describe('llama.cpp props', () => {
	it('accepts the props of a model server', () => {
		expect(
			isLlamaCppProps({
				default_generation_settings: { n_ctx: 4096, params: {} },
				model_path: '/models/qwen.gguf',
				role: 'model',
				total_slots: 1
			})
		).toBe(true);
	});

	it('accepts the props of a router', () => {
		expect(
			isLlamaCppProps({
				build_info: 'b1234',
				default_generation_settings: { n_ctx: 0, params: {} },
				role: 'router'
			})
		).toBe(true);
	});

	it('accepts a router that reports its role and build only', () => {
		expect(isLlamaCppProps({ build_info: 'b1234', role: 'router' })).toBe(true);
	});

	it('refuses the answer of another runtime', () => {
		expect(isLlamaCppProps({ data: [], object: 'list' })).toBe(false);
		expect(isLlamaCppProps({ message: 'Not Found' })).toBe(false);
		expect(isLlamaCppProps({ default_generation_settings: 'nope' })).toBe(false);
		// a role or a build string on its own is a coincidence, not a llama.cpp server
		expect(isLlamaCppProps({ role: 'router' })).toBe(false);
	});

	it('refuses anything that is not an object', () => {
		expect(isLlamaCppProps(null)).toBe(false);
		expect(isLlamaCppProps('llama.cpp')).toBe(false);
		expect(isLlamaCppProps([])).toBe(false);
	});
});
