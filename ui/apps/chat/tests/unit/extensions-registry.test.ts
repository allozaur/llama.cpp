// The registry is the only door between the core and an extension: what an
// extension contributes must be there while it is on and gone, with its
// cleanup run, once it is off.

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('$app/environment', () => ({ browser: true }));

import { EXTENSIONS_LOCALSTORAGE_KEY } from '$lib/constants';
import { ToolSource } from '$lib/enums';
import type { Extension, ExtensionManifest, FlowHook, ToolProvider } from '$lib/extensions';
import { ExtensionRegistry } from '$lib/extensions';

function makeStorage(initial: Record<string, string> = {}) {
	const data = new Map(Object.entries(initial));

	return {
		data,
		getItem: (key: string) => data.get(key) ?? null,
		setItem: (key: string, value: string) => void data.set(key, value)
	};
}

function makeProvider(): ToolProvider {
	return {
		entries: () => [],
		execute: async () => ({ content: '', isError: false }),
		isConfigured: () => true,
		source: ToolSource.MCP
	};
}

function makeManifest(
	extension: Extension,
	overrides: Partial<ExtensionManifest> = {}
): ExtensionManifest {
	return {
		description: 'A test extension',
		id: 'test',
		load: async () => ({ default: extension }),
		name: 'Test',
		...overrides
	};
}

describe('ExtensionRegistry', () => {
	let storage: ReturnType<typeof makeStorage>;

	beforeEach(() => {
		storage = makeStorage();
		vi.stubGlobal('localStorage', storage);
	});

	it('holds what an active extension contributes, per point', async () => {
		const registry = new ExtensionRegistry();
		const provider = makeProvider();
		const hook: FlowHook = () => {};

		registry.register(
			makeManifest({
				activate(ctx) {
					ctx.contribute('tools', provider);
					ctx.contribute('flow', hook);
				}
			})
		);

		expect(registry.contributions('tools')).toEqual([]);

		await registry.activateEnabled();

		expect(registry.contributions('tools')).toEqual([provider]);
		expect(registry.contributions('flow')).toEqual([hook]);
		expect(registry.extensions[0]).toMatchObject({ enabled: true, error: null, state: 'active' });
	});

	it('does not load the code of an extension that is off', async () => {
		const registry = new ExtensionRegistry();
		const load = vi.fn(async () => ({ default: { activate() {} } }));

		registry.register(makeManifest({ activate() {} }, { disabledByDefault: true, load }));
		await registry.activateEnabled();

		expect(load).not.toHaveBeenCalled();
		expect(registry.extensions[0]).toMatchObject({ enabled: false, state: 'inactive' });

		await registry.setEnabled('test', true);

		expect(load).toHaveBeenCalledOnce();
		expect(registry.extensions[0]).toMatchObject({ enabled: true, state: 'active' });
	});

	it('removes the contributions and runs the cleanup when switched off', async () => {
		const registry = new ExtensionRegistry();
		const order: string[] = [];

		registry.register(
			makeManifest({
				activate(ctx) {
					ctx.contribute('tools', makeProvider());
					ctx.onDeactivate(() => void order.push('first'));
					ctx.onDeactivate(async () => void order.push('second'));
				}
			})
		);
		await registry.activateEnabled();
		await registry.setEnabled('test', false);

		expect(registry.contributions('tools')).toEqual([]);
		// last registered, first undone
		expect(order).toEqual(['second', 'first']);
		expect(registry.extensions[0]).toMatchObject({ enabled: false, state: 'inactive' });
	});

	it('keeps only the contributions of the extensions that stay on', async () => {
		const registry = new ExtensionRegistry();
		const kept = makeProvider();

		registry.register(
			makeManifest({ activate: (ctx) => ctx.contribute('tools', makeProvider()) }, { id: 'a' })
		);
		registry.register(
			makeManifest({ activate: (ctx) => ctx.contribute('tools', kept) }, { id: 'b' })
		);
		await registry.activateEnabled();
		await registry.setEnabled('a', false);

		expect(registry.contributions('tools')).toEqual([kept]);
	});

	it('remembers the choice and applies it on the next start', async () => {
		const first = new ExtensionRegistry();

		first.register(makeManifest({ activate() {} }));
		await first.setEnabled('test', false);

		expect(JSON.parse(storage.data.get(EXTENSIONS_LOCALSTORAGE_KEY) ?? '{}')).toEqual({
			test: false
		});

		const second = new ExtensionRegistry();
		const load = vi.fn(async () => ({ default: { activate() {} } }));

		second.register(makeManifest({ activate() {} }, { load }));
		await second.activateEnabled();

		expect(load).not.toHaveBeenCalled();
		expect(second.isEnabled('test')).toBe(false);
	});

	it('shows the stored choice as soon as the extension is known', () => {
		storage.data.set(EXTENSIONS_LOCALSTORAGE_KEY, JSON.stringify({ test: false }));

		const registry = new ExtensionRegistry();

		registry.register(makeManifest({ activate() {} }));

		expect(registry.extensions[0]).toMatchObject({ enabled: false, state: 'inactive' });
	});

	it('keeps the choices in memory when it has no storage key', async () => {
		storage.data.set(EXTENSIONS_LOCALSTORAGE_KEY, JSON.stringify({ test: false }));

		const registry = new ExtensionRegistry({ storageKey: null });

		registry.register(makeManifest({ activate() {} }));

		expect(registry.isEnabled('test')).toBe(true);

		await registry.setEnabled('test', false);

		expect(registry.isEnabled('test')).toBe(false);
		expect(storage.data.get(EXTENSIONS_LOCALSTORAGE_KEY)).toBe(JSON.stringify({ test: false }));
		expect(storage.data.size).toBe(1);
	});

	it('rolls a failed activation back and reports why', async () => {
		const registry = new ExtensionRegistry();
		const cleanup = vi.fn();

		vi.spyOn(console, 'error').mockImplementation(() => {});

		registry.register(
			makeManifest({
				activate(ctx) {
					ctx.contribute('tools', makeProvider());
					ctx.onDeactivate(cleanup);

					throw new Error('boom');
				}
			})
		);
		await registry.activateEnabled();

		expect(registry.contributions('tools')).toEqual([]);
		expect(cleanup).toHaveBeenCalledOnce();
		expect(registry.extensions[0]).toMatchObject({ error: 'boom', state: 'failed' });
	});

	it('reports an extension whose code fails to load', async () => {
		const registry = new ExtensionRegistry();

		vi.spyOn(console, 'error').mockImplementation(() => {});

		registry.register(
			makeManifest(
				{ activate() {} },
				{
					load: async () => {
						throw new Error('chunk missing');
					}
				}
			)
		);
		await registry.activateEnabled();

		expect(registry.extensions[0]).toMatchObject({ error: 'chunk missing', state: 'failed' });
	});

	it('applies on and off in the order they were asked for', async () => {
		const registry = new ExtensionRegistry();

		let release: () => void = () => {};

		const gate = new Promise<void>((resolve) => (release = resolve));

		registry.register(
			makeManifest({
				async activate(ctx) {
					await gate;
					ctx.contribute('tools', makeProvider());
				}
			})
		);

		const starting = registry.activateEnabled();
		const stopping = registry.setEnabled('test', false);

		release();
		await Promise.all([starting, stopping]);

		expect(registry.contributions('tools')).toEqual([]);
		expect(registry.extensions[0]).toMatchObject({ enabled: false, state: 'inactive' });
	});

	it('refuses a contribution from an extension that is no longer active', async () => {
		const registry = new ExtensionRegistry();

		let late: (() => void) | undefined;

		registry.register(
			makeManifest({
				activate(ctx) {
					late = () => ctx.contribute('tools', makeProvider());
				}
			})
		);
		await registry.activateEnabled();
		await registry.setEnabled('test', false);

		expect(() => late?.()).toThrow(/not active/);
		expect(registry.contributions('tools')).toEqual([]);
	});

	it('refuses a second extension with the same id', () => {
		const registry = new ExtensionRegistry();

		registry.register(makeManifest({ activate() {} }));

		expect(() => registry.register(makeManifest({ activate() {} }))).toThrow(/already registered/);
	});
});
