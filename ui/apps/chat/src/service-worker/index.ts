import { withBase } from '#lib/utils/base-path.ts';
import { dev, version } from '$app/env';
import { assets, immutable } from '$app/manifest';
import { self } from '$app/service-worker';

const CACHE = `llama-ui-${version}`;
// sw.js is the legacy worker path; it must always come from the network
const PRECACHE = [
	'./',
	'manifest.webmanifest',
	'_app/version.json',
	...immutable.map(({ path }) => path),
	...assets.map(({ path }) => path).filter((path) => path !== 'sw.js')
].map((path) => new URL(withBase(path), self.location.href).href);
const PRECACHE_PATHS = new Set(PRECACHE.map((href) => new URL(href).pathname));

// the dev server serves no build to cache, yet a worker a production build installed on the
// same origin keeps serving that build; on the dev server this worker replaces it at the next
// update check, clears its caches, unregisters and reloads every window from the network
if (dev) {
	self.addEventListener('install', () => {
		self.skipWaiting();
	});

	self.addEventListener('activate', (event) => {
		event.waitUntil(
			caches
				.keys()
				.then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
				.then(() => self.registration.unregister())
				.then(() => self.clients.matchAll({ type: 'window' }))
				.then((clients) =>
					Promise.all(clients.map((client) => client.navigate(client.url).catch(() => null)))
				)
		);
	});
}

// cache: 'reload' skips the HTTP cache, which may still hold the previous build's index.html
// and version.json: precached next to this build's bundle, they would load a bundle that is gone
self.addEventListener('install', (event) => {
	if (dev) return;

	event.waitUntil(
		caches
			.open(CACHE)
			.then((cache) => cache.addAll(PRECACHE.map((url) => new Request(url, { cache: 'reload' }))))
	);
});

self.addEventListener('activate', (event) => {
	if (dev) return;

	event.waitUntil(
		caches
			.keys()
			.then((keys) =>
				Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))
			)
	);
});

self.addEventListener('message', (event) => {
	if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

// serve only precached app files; API requests and everything else go straight to the network
self.addEventListener('fetch', (event) => {
	if (dev || event.request.method !== 'GET') return;

	const url = new URL(event.request.url);

	if (url.origin !== self.location.origin || !PRECACHE_PATHS.has(url.pathname)) return;

	event.respondWith(
		caches
			.open(CACHE)
			.then((cache) => cache.match(url.pathname))
			.then((cached) => cached ?? fetch(event.request))
	);
});
