import { type Brand, type BrandEnv, resolveBrand } from '../src/lib/brand/brand.ts';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

/** The env var naming a white label's brand directory (absolute, or relative to the working directory) */
export const BRAND_DIR_ENV = 'LLAMA_CHAT_BRAND_DIR';

/** llama.cpp's own brand: what each file falls back to */
export const DEFAULT_BRAND_DIR = resolve(HERE, '..', 'src', 'lib', 'brand', 'default');

/** The brand directory the build uses, if any */
export const BRAND_DIR = process.env[BRAND_DIR_ENV]
	? resolve(process.cwd(), process.env[BRAND_DIR_ENV])
	: undefined;

if (BRAND_DIR && !existsSync(BRAND_DIR)) {
	throw new Error(`${BRAND_DIR_ENV}: no brand directory at ${BRAND_DIR}`);
}

/** The files a brand directory may hold, each optional; the app imports them as `$brand/<file>` */
export const BRAND_FILES = {
	ATTRIBUTION: 'Attribution.svelte',
	COMPOSER_FOOTER: 'ComposerFooter.svelte',
	CONFIG: 'brand.json',
	FAVICON: 'favicon.svg',
	FAVICON_DARK: 'favicon-dark.svg',
	GREETING: 'Greeting.svelte',
	LOGO: 'logo.svg',
	THEME: 'theme.css'
} as const;

type BrandFile = (typeof BRAND_FILES)[keyof typeof BRAND_FILES];

/** llama-brand's artwork, for the files the default brand directory does not hold */
const LLAMA_BRAND_FILES: Partial<Record<BrandFile, string>> = {
	[BRAND_FILES.FAVICON]: '@ggml-org/llama-brand/logo/svg/app/web/favicon.svg',
	[BRAND_FILES.FAVICON_DARK]: '@ggml-org/llama-brand/logo/svg/app/web/favicon-dark.svg',
	[BRAND_FILES.LOGO]: '@ggml-org/llama-brand/logo/svg/icon/icon-light.svg'
};

/** The path of a brand file: the brand directory's own, else llama.cpp's */
export function brandFile(file: BrandFile): string {
	if (BRAND_DIR && existsSync(resolve(BRAND_DIR, file))) return resolve(BRAND_DIR, file);

	const llamaBrand = LLAMA_BRAND_FILES[file];

	return llamaBrand ? require.resolve(llamaBrand) : resolve(DEFAULT_BRAND_DIR, file);
}

/** The brand, as the app resolves it (src/lib/brand/index.ts), for code that runs in Node */
export function loadBrand(env: BrandEnv = process.env): Brand {
	return resolveBrand(JSON.parse(readFileSync(brandFile(BRAND_FILES.CONFIG), 'utf8')), env);
}
