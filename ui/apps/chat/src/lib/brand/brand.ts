/**
 * The brand: everything that names, colours and words Llama Chat as a product. A white label
 * overrides it with a brand directory (see README.md, "White labels"); without one it is
 * llama.cpp's own. Plain data, read both in the browser (src/lib/brand/index.ts) and in Node by
 * the build (scripts/brand.ts).
 */

/** A prompt the new-chat screen offers; clicking it fills the composer */
export interface BrandSuggestion {
	title: string;
	prompt: string;
}

export interface Brand {
	/** The app's name: page titles, the installed app's name */
	name: string;
	/** The installed app's label under its icon; the name when not set */
	shortName: string;
	/** The installed app's description (PWA manifest) */
	description: string;
	/** The interface language: `<html lang>` and the PWA manifest */
	lang: string;
	colors: {
		/** The splash screens' and PWA manifest's background */
		background: { light: string; dark: string };
		/** The browser chrome around the app (`theme-color`) */
		theme: { light: string; dark: string };
	};
	/** The new-chat screen's heading and line under it; no subtitle keeps the built-in one */
	greeting: { title: string; subtitle?: string };
	/** Prompts offered under the greeting */
	suggestions: BrandSuggestion[];
	/** The composer's placeholder; ChatForm's own when not set */
	composer: { placeholder?: string };
	/** The model the app suggests serving, as a Hugging Face `repo[:quant]` */
	defaultModel: string;
	/** Draw the logo (`$brand/logo.svg`) in the text colour; off keeps its own colours */
	logo: { monochrome: boolean };
}

/** What a brand's brand.json may set: any part of the brand */
export type BrandOverrides = {
	[K in keyof Brand]?: Brand[K] extends unknown[]
		? Brand[K]
		: Brand[K] extends object
			? { [P in keyof Brand[K]]?: Partial<Brand[K][P]> | Brand[K][P] }
			: Brand[K];
};

/** Build-time env that takes precedence over the brand (VITE_PUBLIC_APP_NAME, VITE_PUBLIC_APP_LANG) */
export type BrandEnv = Record<string, string | undefined>;

/** The props a brand's slot components receive */
export interface BrandSlotProps {
	brand: Brand;
	composer: BrandComposer;
}

/** The new-chat composer, for a brand's slots */
export interface BrandComposer {
	/** Put text in the composer and focus it, without sending it */
	prefill(text: string): void;
	/** Overrides the placeholder at runtime (e.g. when the brand's language changes) */
	placeholder: string | undefined;
}

/** llama.cpp's own brand: today's Llama Chat */
export const DEFAULT_BRAND: Brand = {
	colors: {
		background: { dark: '#111111', light: 'white' },
		theme: { dark: '#0d0d0d', light: '#ffffff' }
	},
	composer: {},
	defaultModel: 'ggml-org/gemma-3-4b-it-GGUF',
	description: 'Local AI chat interface powered by llama.cpp',
	greeting: { title: 'Hello there' },
	lang: 'en',
	logo: { monochrome: true },
	name: 'llama-ui',
	shortName: '',
	suggestions: []
};

function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function merge<T>(base: T, overrides: unknown): T {
	if (!isObject(base) || !isObject(overrides)) return (overrides ?? base) as T;

	const result: Record<string, unknown> = { ...base };

	for (const [key, value] of Object.entries(overrides)) {
		if (key.startsWith('$') || value === undefined) continue;

		result[key] = key in base ? merge(base[key as keyof T], value) : value;
	}

	return result as T;
}

/** The brand from a brand's overrides over llama.cpp's, then the env's name and language over both */
export function resolveBrand(overrides: BrandOverrides = {}, env: BrandEnv = {}): Brand {
	const brand = merge(DEFAULT_BRAND, overrides);
	const name = env.VITE_PUBLIC_APP_NAME || brand.name;

	return {
		...brand,
		lang: env.VITE_PUBLIC_APP_LANG || brand.lang,
		name,
		shortName: overrides.shortName || name
	};
}
