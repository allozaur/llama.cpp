import { LLAMA_UI_ALIASES, LLAMA_UI_DEPENDENCIES, LLAMA_UI_ROOT } from './llama-ui.js';
import { type Plugin, transformWithEsbuild } from 'vite';

const TYPESCRIPT_FILE = /\.ts$/;
// what the library's sources need of a tsconfig: imports and exports stay as written
const TSCONFIG = JSON.stringify({ compilerOptions: { verbatimModuleSyntax: true } });
const LIBRARY_FILE = new RegExp(`^${LLAMA_UI_ROOT.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`);

/**
 * Compiles Llama UI (@ggml/llama-ui, in ui/lib/ui) from its source as part of this app, with
 * no install or build of the library itself (see ./llama-ui.js for the why):
 *
 * - its entry points resolve to their sources,
 * - what those sources import resolves from this app's node_modules,
 * - the dev server may serve them,
 * - their TypeScript is stripped here. Vite would read the tsconfig.json nearest to each file
 *   for that, and the library's extends one that only exists once the library is installed.
 */
export function llamaUiPlugin(): Plugin {
	return {
		config() {
			return {
				esbuild: { exclude: [/\.js$/, LIBRARY_FILE] },
				resolve: { alias: LLAMA_UI_ALIASES, dedupe: LLAMA_UI_DEPENDENCIES },
				server: { fs: { allow: [LLAMA_UI_ROOT] } }
			};
		},
		enforce: 'pre',
		name: 'llama-ui',
		async transform(code, id) {
			const file = id.split('?')[0];

			if (!LIBRARY_FILE.test(file) || !TYPESCRIPT_FILE.test(file)) return;

			const result = await transformWithEsbuild(code, file, {
				loader: 'ts',
				sourcemap: true,
				target: 'esnext',
				tsconfigRaw: TSCONFIG
			});

			return { code: result.code, map: result.map };
		}
	};
}
