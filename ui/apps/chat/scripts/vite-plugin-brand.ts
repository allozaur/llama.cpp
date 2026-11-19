import { BRAND_DIR, BRAND_FILES, brandFile } from './brand';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';

// the stylesheet that loads the brand's theme.css (Tailwind inlines that, so it is never a module of its own)
const BRAND_STYLESHEET = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'brand.css');
// what a brand's own modules import (svelte, @lucide/svelte, $app/*, #lib/*) resolves as if the app imported it
const APP_IMPORTER = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'app.html');

function escapeRegExp(text: string): string {
	return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * The white-label brand (scripts/brand.ts): `$brand/<file>` resolves to the brand directory's
 * file (LLAMA_CHAT_BRAND_DIR), or to llama.cpp's own when the brand has none. Aliases rather
 * than a resolver, so Tailwind follows them from CSS too.
 */
export function brandPlugin(): Plugin {
	return {
		config() {
			return {
				resolve: {
					alias: Object.values(BRAND_FILES).map((file) => ({
						// with or without a query, e.g. `$brand/logo.svg?raw`
						find: new RegExp(`^\\$brand/${escapeRegExp(file)}(?=\\?|$)`),
						replacement: brandFile(file)
					}))
				},
				server: { fs: { allow: BRAND_DIR ? [BRAND_DIR] : [] } }
			};
		},
		enforce: 'pre',
		name: 'llamacpp:brand',
		async resolveId(id, importer, options) {
			if (!BRAND_DIR || !importer?.startsWith(BRAND_DIR + '/')) return;

			if (id.startsWith('.') || id.startsWith('/') || id.startsWith('\0')) return;

			return this.resolve(id, APP_IMPORTER, { ...options, skipSelf: true });
		},
		transform(code, id) {
			// the brand's components may use Tailwind classes: have Tailwind scan them too
			if (!BRAND_DIR || id.split('?')[0] !== BRAND_STYLESHEET) return;

			return { code: `${code}\n@source ${JSON.stringify(BRAND_DIR)};\n`, map: null };
		}
	};
}
