import { DEFAULT_BRAND, resolveBrand } from '#lib/brand/brand.ts';
import { describe, expect, it } from 'vitest';

describe('resolveBrand', () => {
	it('is llama.cpp brand without overrides', () => {
		expect(resolveBrand()).toEqual({ ...DEFAULT_BRAND, shortName: DEFAULT_BRAND.name });
	});

	it('merges nested overrides over the defaults', () => {
		const brand = resolveBrand({
			colors: { background: { dark: '#000000' } },
			greeting: { title: 'Witaj' },
			name: 'Bielik'
		});

		expect(brand.colors.background).toEqual({ dark: '#000000', light: 'white' });
		expect(brand.colors.theme).toEqual(DEFAULT_BRAND.colors.theme);
		expect(brand.greeting).toEqual({ title: 'Witaj' });
		expect(brand.shortName).toBe('Bielik');
	});

	it('replaces lists rather than merging them', () => {
		const suggestions = [{ prompt: 'Hi', title: 'Greet' }];

		expect(resolveBrand({ suggestions }).suggestions).toEqual(suggestions);
	});

	it('lets the env name and language win over the brand', () => {
		const brand = resolveBrand(
			{ lang: 'pl', name: 'PLLuM Chat', shortName: 'PLLuM' },
			{ VITE_PUBLIC_APP_LANG: 'en', VITE_PUBLIC_APP_NAME: 'Staging' }
		);

		expect(brand).toMatchObject({ lang: 'en', name: 'Staging', shortName: 'PLLuM' });
	});

	it('ignores $-keys such as $schema or $comment', () => {
		expect(resolveBrand({ $comment: 'x' } as never)).not.toHaveProperty('$comment');
	});
});
