/**
 * The brand the app is built with. `$brand/*` resolves to the brand directory's file, or to the
 * default in ./default when the brand has none (scripts/vite-plugin-brand.ts).
 */
import { resolveBrand } from './brand.ts';
import overrides from '$brand/brand.json';

export * from './brand.ts';

export const BRAND = resolveBrand(overrides, import.meta.env);
