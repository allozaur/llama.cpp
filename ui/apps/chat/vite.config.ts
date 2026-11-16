import { buildInfoPlugin } from './scripts/vite-plugin-build-info';
import { llamaUiPlugin } from './scripts/vite-plugin-llama-ui';
import { nerdamerPlugin } from './scripts/vite-plugin-nerdamer';
import { pwaManifestPlugin } from './scripts/vite-plugin-pwa-manifest';
import { relativizeBasePlugin } from './scripts/vite-plugin-relativize-base';
import { splashScreenPlugin } from './scripts/vite-plugin-splash-screen';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';
import { playwright } from '@vitest/browser-playwright';
import { mdsvex } from 'mdsvex';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, loadEnv, type ProxyOptions, searchForWorkspaceRoot } from 'vite';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LLAMA_VOICE_SOURCE = resolve(__dirname, '../../lib/voice/src');
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const browserBaseConfig: any = {
	enabled: true,
	instances: [{ browser: 'chromium' }],
	// CI runs the bundled Chromium without its sandbox, which the runners can't start;
	// locally, the installed (auto-updated) Chrome with its sandbox on, see playwright.config.ts
	provider: playwright({
		launchOptions: process.env.CI
			? { args: ['--no-sandbox'] }
			: { channel: 'chrome', chromiumSandbox: true }
	})
};
// CMake sets LLAMA_UI_OUT_DIR to the staging dir under the build tree; manual
// `npm run build` runs without the env var default to ./dist.
const outDir = process.env.LLAMA_UI_OUT_DIR ?? './dist';

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), 'VITE_PUBLIC_');
	const SERVER_ORIGIN = env.VITE_PUBLIC_SERVER_ORIGIN || 'http://localhost:9931';
	// llama-server takes cross-origin browser requests only from --cors-origins, so the proxy
	// calls it as its own page: the Host of the server and no Origin. Sec-Fetch-Site still
	// passes through, so the server keeps refusing requests from other sites.
	const toServer = (ws = false): ProxyOptions => ({
		changeOrigin: true,
		configure: (proxy) => {
			proxy.on('proxyReq', (req) => req.removeHeader('origin'));
			proxy.on('proxyReqWs', (req) => req.removeHeader('origin'));
		},
		target: SERVER_ORIGIN,
		ws
	});

	return {
		build: {
			assetsInlineLimit: 32000,
			chunkSizeWarningLimit: 3072,
			minify: true
		},

		plugins: [
			llamaUiPlugin(),
			tailwindcss(),
			sveltekit({
				adapter: adapter({
					assets: outDir,
					fallback: 'index.html',
					pages: outDir,
					precompress: false,
					strict: true
				}),
				extensions: ['.svelte', '.svx'],
				output: { bundleStrategy: 'split' },
				paths: { relative: true },
				// Consult https://svelte.dev/docs/kit/integrations
				// for more information about preprocessors
				// mdsvex is for content pages we write ourselves (e.g. release notes reachable from the
				// chat app): .svx files compiled to components at build time. No page uses it yet.
				// It can't render chat input or messages, which are typed at runtime and go through
				// the remark/rehype pipeline in MarkdownContent instead.
				preprocess: [vitePreprocess(), mdsvex()],
				router: { type: 'hash' },
				// registered by usePwa() so the update prompt can drive it
				serviceWorker: { register: false }
			}),
			pwaManifestPlugin(),
			splashScreenPlugin(),
			buildInfoPlugin(),
			nerdamerPlugin(),
			relativizeBasePlugin()
		],

		resolve: {
			alias: [
				// Llama Voice has no build step in the repo: the app compiles it from source. Exact
				// matches, so the package's root does not swallow its ./svelte entry
				{
					find: /^@ggml-org\/llama-voice\/svelte$/,
					replacement: resolve(LLAMA_VOICE_SOURCE, 'svelte/index.ts')
				},
				{ find: /^@ggml-org\/llama-voice$/, replacement: resolve(LLAMA_VOICE_SOURCE, 'index.ts') },
				{ find: 'katex-fonts', replacement: resolve('node_modules/katex/dist/fonts') }
			]
		},

		server: {
			fs: {
				allow: [
					searchForWorkspaceRoot(process.cwd()),
					resolve(__dirname, 'tests'),
					LLAMA_VOICE_SOURCE
				]
			},
			headers: {
				'Cross-Origin-Embedder-Policy': 'require-corp',
				'Cross-Origin-Opener-Policy': 'same-origin'
			},
			proxy: {
				'/cors-proxy': toServer(),
				'/models': toServer(),
				'/props': toServer(),
				'/slots': toServer(),
				'/tools': toServer(),
				// ws: realtime transcription (/v1/realtime) is a WebSocket
				'/v1': toServer(true)
			}
		},

		test: {
			projects: [
				{
					extends: './vite.config.ts',
					test: {
						browser: browserBaseConfig,
						include: ['tests/client/**/*.svelte.{test,spec}.{js,ts}'],
						name: 'client',
						setupFiles: ['./vitest-setup-client.ts']
					}
				},

				{
					extends: './vite.config.ts',
					test: {
						environment: 'node',
						include: ['tests/unit/**/*.{test,spec}.{js,ts}'],
						name: 'unit'
					}
				},

				{
					extends: './vite.config.ts',
					plugins: [
						storybookTest({
							storybookScript: 'pnpm run storybook --no-open'
						})
					],
					test: {
						browser: { ...browserBaseConfig, instances: [{ browser: 'chromium', headless: true }] },
						// Llama UI's stories, shown in this Storybook too, are tested by the library itself (ui/lib/ui)
						exclude: ['../../lib/ui/tests/**'],
						name: 'ui'
					}
				}
			]
		}
	};
});
