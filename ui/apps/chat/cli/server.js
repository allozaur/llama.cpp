/**
 * `npx @ggml-org/llama-chat`: serves the prebuilt Llama Chat (`dist`) as static files on
 * localhost. `npx @ggml-org/llama-chat build` writes the same files to a folder instead, for any
 * static file server. Node built-ins only, so the published package has no dependencies: no
 * llama-server, no models, no Vite or SvelteKit.
 *
 * It only serves files and forwards nothing: the browser calls each llama-server the app is
 * pointed at directly, so llama-server's own rules (--cors-origins, --api-key) apply as they do
 * to any other page. `--server` only tells the app which servers to add: the CLI serves them in
 * `llama-chat.json` next to index.html, and `build` writes that file, which the app reads at
 * startup. index.html carries a marker for it, so a page served any other way, such as by
 * llama-server or the dev server, does not ask for a file that is not there.
 */

import { spawn } from 'node:child_process';
import { createReadStream, readFileSync } from 'node:fs';
import { cp, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import http from 'node:http';
import { extname, isAbsolute, join, normalize, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

export const PACKAGE_ROOT = fileURLToPath(new URL('..', import.meta.url));
export const DIST_DIR = join(PACKAGE_ROOT, 'dist');

export const DEFAULTS = Object.freeze({
	host: '127.0.0.1',
	// the folder `build` writes to, in the current directory
	out: 'llama-chat',
	// fixed, so the origin, and the chats the browser stores under it, stay the same between runs
	port: 3000
});

/** The file next to index.html that lists the servers the app adds at startup. */
export const PRESET_FILE = 'llama-chat.json';

/**
 * The marker in index.html that sends the app to `llama-chat.json`. It names the file rather
 * than the servers: the service worker keeps index.html, so servers in it would outlive a run.
 */
export const PRESET_META = `<meta name="llama-chat-servers" content="${PRESET_FILE}" />`;

// The same caching llama-server applies to the UI it embeds (tools/server/server-http.cpp):
// index.html and the PWA's update checks are revalidated, hashed assets are cached for good.
const NO_CACHE = new Set([
	'/index.html',
	'/service-worker.js',
	'/sw.js',
	'/manifest.webmanifest',
	'/_app/version.json',
	'/build.json',
	`/${PRESET_FILE}`
]);
const CACHE_IMMUTABLE = 'public, max-age=31536000, immutable';
const CACHE_REVALIDATE = 'no-cache';
/** @type {Record<string, string>} */
const MIME_TYPES = {
	'.css': 'text/css; charset=utf-8',
	'.gif': 'image/gif',
	'.html': 'text/html; charset=utf-8',
	'.ico': 'image/x-icon',
	'.jpg': 'image/jpeg',
	'.js': 'text/javascript; charset=utf-8',
	'.json': 'application/json; charset=utf-8',
	'.map': 'application/json; charset=utf-8',
	'.mjs': 'text/javascript; charset=utf-8',
	'.png': 'image/png',
	'.svg': 'image/svg+xml',
	'.ttf': 'font/ttf',
	'.txt': 'text/plain; charset=utf-8',
	'.wasm': 'application/wasm',
	'.webmanifest': 'application/manifest+json; charset=utf-8',
	'.webp': 'image/webp',
	'.woff': 'font/woff',
	'.woff2': 'font/woff2'
};
const SERVE_OPTIONS = ['host', 'open', 'port'];
const BUILD_OPTIONS = ['force', 'out'];

export const USAGE = `Usage: llama-chat [options]
       llama-chat build [--out <dir>] [--force] [--server <url>]

Serves Llama Chat on localhost as static files, or, with build, writes them to
a folder for any HTTP server. The browser talks to llama-server directly: start
it with --cors-origins set to this page's address when it restricts origins.

Options:
  --server <url>   a llama-server the app adds on startup, repeatable; the API
                   key, if it needs one, goes in the app
  --port <n>       port to listen on (default: ${DEFAULTS.port})
  --host <addr>    address to listen on, 0.0.0.0 for the LAN (default: ${DEFAULTS.host})
  --open           open the browser once it listens (default)
  --no-open        do not open the browser
  -v, --version    print the version
  -h, --help       print this help

Build options:
  --out <dir>      folder to write to (default: ./${DEFAULTS.out})
  --force          write into a folder that is not empty
  --server <url>   as above, written to ${PRESET_FILE} in the folder

Examples:
  npx @ggml-org/llama-chat --server http://127.0.0.1:9931
  npx @ggml-org/llama-chat --host 0.0.0.0 --port 3000 --no-open
  npx @ggml-org/llama-chat build --out ./public --server https://llm.example.com`;

/** The version in this package's package.json. */
export function packageVersion() {
	return JSON.parse(readFileSync(join(PACKAGE_ROOT, 'package.json'), 'utf8')).version;
}

/**
 * Reads the command line. No verb serves the app, `start` means the same, and `build` writes it
 * to a folder.
 * @param {string[]} argv the arguments after the command
 * @returns {{ command: 'build' | 'serve', force: boolean, help: boolean, host: string, open: boolean, out: string, port: number, servers: string[], version: boolean }}
 */
export function parseCliArgs(argv) {
	const { positionals, values } = parseArgs({
		allowNegative: true,
		allowPositionals: true,
		args: argv,
		options: {
			force: { type: 'boolean' },
			help: { short: 'h', type: 'boolean' },
			host: { type: 'string' },
			open: { type: 'boolean' },
			out: { type: 'string' },
			port: { type: 'string' },
			server: { multiple: true, type: 'string' },
			version: { short: 'v', type: 'boolean' }
		},
		strict: true
	});
	const [verb, ...rest] = positionals;

	if ((verb !== undefined && verb !== 'start' && verb !== 'build') || rest.length > 0) {
		throw new Error(`unknown command: ${positionals.join(' ')}`);
	}

	const command = verb === 'build' ? 'build' : 'serve';
	const misplaced = (command === 'build' ? SERVE_OPTIONS : BUILD_OPTIONS).find(
		(name) => name in values
	);

	if (misplaced) {
		throw new Error(
			`--${misplaced} does not apply to ${command === 'build' ? 'build' : 'serving'}`
		);
	}

	const port = Number(values.port ?? DEFAULTS.port);

	if (!Number.isInteger(port) || port < 0 || port > 65535) {
		throw new Error(`invalid --port: ${values.port}`);
	}

	return {
		command,
		force: values.force ?? false,
		help: values.help ?? false,
		host: values.host ?? DEFAULTS.host,
		open: values.open ?? true,
		out: values.out ?? DEFAULTS.out,
		port,
		servers: (values.server ?? []).map(parseServerUrl),
		version: values.version ?? false
	};
}

/**
 * A llama-server address for the app, with or without `http://`, as the app stores it: no
 * trailing slash, a path kept (for `--api-prefix`).
 * @param {string} value
 */
export function parseServerUrl(value) {
	let url;

	try {
		url = new URL(/^[a-z][a-z\d+.-]*:\/\//i.test(value) ? value : `http://${value}`);
	} catch {
		throw new Error(`invalid --server: ${value}`);
	}

	if (url.protocol !== 'http:' && url.protocol !== 'https:') {
		throw new Error(`invalid --server: ${value} (use an http:// or https:// address)`);
	}

	if (url.search || url.hash || url.username || url.password) {
		throw new Error(`invalid --server: ${value} (no query, fragment or credentials)`);
	}

	return url.href.replace(/\/+$/, '');
}

/**
 * index.html with the marker for `llama-chat.json` at the end of its head, once.
 * @param {string} html
 */
export function withPresetMeta(html) {
	if (html.includes('name="llama-chat-servers"')) return html;

	return html.replace('</head>', `\t${PRESET_META}\n\t</head>`);
}

/**
 * The contents of `llama-chat.json`.
 * @param {string[]} servers
 */
export function presetFile(servers) {
	return `${JSON.stringify({ servers: servers.map((url) => ({ url })) }, null, '\t')}\n`;
}

/**
 * Maps a request path to a file under `root`, or null when it falls outside it.
 * @param {string} root
 * @param {string} pathname
 */
function resolveStatic(root, pathname) {
	let decoded;

	try {
		decoded = decodeURIComponent(pathname);
	} catch {
		return null;
	}

	if (decoded.includes('\0')) return null;

	const file = normalize(join(root, decoded === '/' ? '/index.html' : decoded));

	return file === root || file.startsWith(root.endsWith(sep) ? root : root + sep) ? file : null;
}

/**
 * Sends a file from `dist`, with llama-server's caching and cross-origin isolation headers.
 * @param {http.IncomingMessage} req
 * @param {http.ServerResponse} res
 * @param {string} file
 * @param {string} pathname
 * @param {import('node:fs').Stats} stats
 */
function sendFile(req, res, file, pathname, stats) {
	const name = pathname === '/' ? '/index.html' : pathname;
	// index.html goes out with the marker for llama-chat.json, and an ETag of its own
	const body =
		name === '/index.html' ? Buffer.from(withPresetMeta(readFileSync(file, 'utf8'))) : null;
	const etag = `W/"${(body?.length ?? stats.size).toString(16)}-${Math.floor(stats.mtimeMs).toString(16)}"`;

	res.setHeader('ETag', etag);
	res.setHeader('Cache-Control', NO_CACHE.has(name) ? CACHE_REVALIDATE : CACHE_IMMUTABLE);

	if (name === '/index.html') {
		res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
		res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
	}

	if (req.headers['if-none-match'] === etag) {
		res.writeHead(304).end();

		return;
	}

	res.setHeader(
		'Content-Type',
		MIME_TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream'
	);
	res.setHeader('Content-Length', body?.length ?? stats.size);
	res.writeHead(200);

	if (req.method === 'HEAD') {
		res.end();

		return;
	}

	if (body) {
		res.end(body);

		return;
	}

	createReadStream(file).pipe(res);
}

/**
 * @param {http.ServerResponse} res
 * @param {number} status
 * @param {string} message
 */
function sendError(res, status, message) {
	res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' });
	res.end(`${message}\n`);
}

/**
 * The HTTP server: the files of `dist`, read-only, and `llama-chat.json` with the servers given,
 * if any: index.html always points the app at it.
 * @param {{ distDir?: string, servers?: string[] }} [options]
 */
export function createChatServer({ distDir = DIST_DIR, servers = [] } = {}) {
	const root = normalize(distDir);
	const preset = Buffer.from(presetFile(servers));

	return http.createServer(async (req, res) => {
		const { pathname } = new URL(req.url ?? '/', 'http://localhost');

		if (req.method !== 'GET' && req.method !== 'HEAD') {
			res.setHeader('Allow', 'GET, HEAD');
			sendError(res, 405, 'Method Not Allowed');

			return;
		}

		if (pathname === `/${PRESET_FILE}`) {
			res.writeHead(200, {
				'Cache-Control': CACHE_REVALIDATE,
				'Content-Length': preset.length,
				'Content-Type': MIME_TYPES['.json']
			});
			res.end(req.method === 'HEAD' ? undefined : preset);

			return;
		}

		const file = resolveStatic(root, pathname);
		const stats = file ? await stat(file).catch(() => null) : null;

		if (file && stats?.isFile()) {
			sendFile(req, res, file, pathname, stats);

			return;
		}

		sendError(res, 404, 'Not Found');
	});
}

/**
 * Writes the app to a folder: the files of `dist` without source maps, ready for any static
 * file server, and `llama-chat.json` when servers are given, with the marker in index.html. Refuses a folder that is not empty
 * unless `force` is set, and a folder in `dist`.
 * @param {{ distDir?: string, force?: boolean, out: string, servers?: string[] }} options
 * @returns {Promise<string>} the absolute path of the folder
 */
export async function buildStatic({ distDir = DIST_DIR, force = false, out, servers = [] }) {
	const source = resolve(distDir);
	const target = resolve(out);
	const inside = relative(source, target);

	if (inside === '' || !(inside.startsWith('..') || isAbsolute(inside))) {
		throw new Error(`cannot build into ${target}, it is inside the app's own files`);
	}

	const entries = await readdir(target).catch(() => []);

	if (entries.length > 0 && !force) {
		throw new Error(`${target} is not empty, pick another --out or add --force`);
	}

	await cp(source, target, { filter: (file) => !file.endsWith('.map'), recursive: true });

	if (servers.length > 0) {
		const index = join(target, 'index.html');

		await writeFile(join(target, PRESET_FILE), presetFile(servers));
		await writeFile(index, withPresetMeta(await readFile(index, 'utf8')));
	}

	return target;
}

/**
 * Opens a URL in the default browser, quietly doing nothing where that fails.
 * @param {string} url
 */
function openBrowser(url) {
	const [command, args] =
		process.platform === 'darwin'
			? ['open', [url]]
			: process.platform === 'win32'
				? ['cmd', ['/c', 'start', '""', url]]
				: ['xdg-open', [url]];

	try {
		// verbatim, or Node quotes the empty title of `start` into one cmd.exe misreads
		spawn(command, args, { detached: true, stdio: 'ignore', windowsVerbatimArguments: true })
			.on('error', () => {})
			.unref();
	} catch {
		// no browser to open, e.g. on a headless machine
	}
}

/**
 * Runs the command.
 * @param {string[]} argv the arguments after the command
 * @returns {Promise<http.Server | undefined>} the server, once it listens
 */
export async function main(argv) {
	let options;

	try {
		options = parseCliArgs(argv);
	} catch (error) {
		console.error(`llama-chat: ${error instanceof Error ? error.message : error}\n\n${USAGE}`);
		process.exitCode = 2;

		return;
	}

	if (options.help) {
		console.log(USAGE);

		return;
	}

	if (options.version) {
		console.log(packageVersion());

		return;
	}

	if (!(await stat(join(DIST_DIR, 'index.html')).catch(() => null))) {
		console.error(`llama-chat: no build found in ${DIST_DIR}, run \`npm run build\` first`);
		process.exitCode = 1;

		return;
	}

	if (options.command === 'build') {
		try {
			const target = await buildStatic({
				force: options.force,
				out: options.out,
				servers: options.servers
			});
			const shown = relative(process.cwd(), target) || '.';

			console.log(`Llama Chat ${packageVersion()} written to ${target}`);

			for (const server of options.servers) console.log(`Adds the llama-server at ${server}`);

			console.log(`Serve it with any static file server, e.g.: npx http-server ${shown}`);
		} catch (error) {
			console.error(`llama-chat: ${error instanceof Error ? error.message : error}`);
			process.exitCode = 1;
		}

		return;
	}

	const server = createChatServer({ servers: options.servers });

	return new Promise((resolve) => {
		server.on('error', (error) => {
			const busy = /** @type {NodeJS.ErrnoException} */ (error).code === 'EADDRINUSE';

			console.error(
				busy
					? `llama-chat: port ${options.port} is in use, pick another with --port`
					: `llama-chat: ${error.message}`
			);
			process.exitCode = 1;
			resolve(undefined);
		});

		server.listen(options.port, options.host, () => {
			const address = /** @type {import('node:net').AddressInfo} */ (server.address());
			const shown = ['0.0.0.0', '::'].includes(options.host) ? 'localhost' : options.host;
			const url = `http://${shown.includes(':') ? `[${shown}]` : shown}:${address.port}/`;

			console.log(`Llama Chat ${packageVersion()} on ${url}`);

			for (const server of options.servers) console.log(`Adds the llama-server at ${server}`);

			console.log(
				`If llama-server restricts origins (tools or MCP on), start it with --cors-origins ${url.slice(0, -1)}`
			);

			if (options.open) openBrowser(url);

			resolve(server);
		});
	});
}
