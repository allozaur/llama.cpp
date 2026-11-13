import { extensions } from '$lib/extensions';
import { BUILT_IN_EXTENSIONS } from '$lib/extensions/builtin';

/**
 * Switch the built-in extensions on, as the app does at startup. Storybook
 * runs this once before all stories (`.storybook/preview.ts`), so a story
 * does not call it. Safe to call again: a known extension is not registered
 * twice.
 */
export async function activateBuiltInExtensions(): Promise<void> {
	const known = new Set(extensions.extensions.map((extension) => extension.id));

	for (const manifest of BUILT_IN_EXTENSIONS) {
		if (!known.has(manifest.id)) extensions.register(manifest);
	}

	await extensions.activateEnabled();
}
