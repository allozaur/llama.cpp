import { FAVICON_PATHS } from '../src/lib/constants/pwa.constants';
import { BRAND_FILES, brandFile } from './brand';
import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const DEFAULT_OUT_DIR = resolve(HERE, '..', 'static');

/**
 * The web favicons, keyed by the file they become: the brand's (`favicon.svg`, `favicon-dark.svg`
 * in its directory), else llama-brand's, which are optically centred.
 */
export const BRAND_FAVICONS = {
	[FAVICON_PATHS.SVG_DARK]: brandFile(BRAND_FILES.FAVICON_DARK),
	[FAVICON_PATHS.SVG_LIGHT]: brandFile(BRAND_FILES.FAVICON)
} as const;

/**
 * Copy the brand's light and dark favicons into the static directory, where
 * they are served as they are and feed the PWA asset generator.
 */
export function writeBrandFavicons(outDir: string = DEFAULT_OUT_DIR): void {
	mkdirSync(outDir, { recursive: true });

	for (const [fileName, source] of Object.entries(BRAND_FAVICONS)) {
		copyFileSync(source, resolve(outDir, fileName));
	}
}
