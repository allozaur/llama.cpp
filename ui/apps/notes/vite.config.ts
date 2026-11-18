import { llamaUiPlugin } from './scripts/vite-plugin-llama-ui.ts';
import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig, loadEnv, type ProxyOptions, searchForWorkspaceRoot } from 'vite';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const browserBaseConfig: any = {
	enabled: true,
	instances: [{ browser: 'chromium' }],
	// CI runs the bundled Chromium without its sandbox, which the runners can't start;
	// locally, the installed Chrome with its sandbox on
	provider: playwright({
		launchOptions: process.env.CI
			? { args: ['--no-sandbox'] }
			: { channel: 'chrome', chromiumSandbox: true }
	})
};

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), 'VITE_PUBLIC_');
	const SERVER_ORIGIN = env.VITE_PUBLIC_SERVER_ORIGIN || 'http://localhost:9931';
	// llama-server takes cross-origin browser requests only from --cors-origins, so the proxy
	// calls it as its own page: the Host of the server and no Origin. Sec-Fetch-Site still
	// passes through, so the server keeps refusing requests from other sites.
	const toServer: ProxyOptions = {
		changeOrigin: true,
		configure: (proxy) => {
			proxy.on('proxyReq', (req) => req.removeHeader('origin'));
		},
		target: SERVER_ORIGIN
	};

	return {
		plugins: [
			llamaUiPlugin(),
			tailwindcss(),
			sveltekit({
				adapter: adapter({
					assets: './dist',
					fallback: 'index.html',
					pages: './dist',
					precompress: false,
					strict: true
				}),
				paths: { relative: true },
				preprocess: [vitePreprocess()],
				// the app is static files under any path, as Llama Chat is
				router: { type: 'hash' }
			})
		],

		server: {
			fs: {
				allow: [searchForWorkspaceRoot(process.cwd())]
			},
			proxy: {
				'/completion': toServer,
				'/props': toServer,
				'/tokenize': toServer,
				'/v1': toServer
			}
		},

		test: {
			projects: [
				{
					extends: './vite.config.ts',
					test: {
						browser: browserBaseConfig,
						include: ['tests/client/**/*.svelte.{test,spec}.{js,ts}'],
						name: 'client'
					}
				},

				{
					extends: './vite.config.ts',
					test: {
						environment: 'node',
						include: ['tests/unit/**/*.{test,spec}.{js,ts}'],
						name: 'unit'
					}
				}
			]
		}
	};
});
