import { BUILT_IN_EXTENSIONS } from '#lib/extensions/builtin.ts';
import { extensions } from '#lib/extensions/index.ts';

/**
 * Switch the built-in extensions on, as the app does at startup. A story
 * that shows what an extension adds awaits this in its `beforeEach`.
 */
export async function activateBuiltInExtensions(): Promise<void> {
	const known = new Set(extensions.extensions.map((extension) => extension.id));

	for (const manifest of BUILT_IN_EXTENSIONS) {
		if (!known.has(manifest.id)) extensions.register(manifest);
	}

	await extensions.activateEnabled();
}
