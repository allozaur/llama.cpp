/**
 * Static Hugging Face Spaces that serve a Llama Chat build: what scripts/space.ts (previews of a branch)
 * and scripts/app-space.ts (the app on its own Space) share. It uses the `hf` CLI and its login, or HF_TOKEN.
 */

import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const UI_DIR = resolve(import.meta.dirname, '..');
const UI_ROOT = resolve(UI_DIR, '../..');
const DIST_DIR = join(UI_DIR, 'dist');

export const HF_ENDPOINT = 'https://huggingface.co';
export const SHORT_SHA_LENGTH = 10;
export const SPACE_ID_REGEX = /^[\w.-]+\/[\w.-]+$/;
export const SERVER_URL_REGEX = /^https?:\/\/[^/]/;
export const DEFAULT_VISIBILITY = 'public';
export const VISIBILITIES = [DEFAULT_VISIBILITY, 'protected', 'private'];
// not handed to the build, which runs the branch's code and its dependencies
const TOKEN_VARIABLES = ['HF_TOKEN', 'GITHUB_TOKEN', 'GH_TOKEN'];

export interface Space {
	host?: string;
	id: string;
	lastModified?: string;
	private?: boolean;
	tags?: string[];
}

export function run(cmd: string, args: string[]): string {
	return execFileSync(cmd, args, { cwd: UI_DIR, encoding: 'utf8' }).trim();
}

export function tryRun(cmd: string, args: string[]): string | null {
	try {
		return execFileSync(cmd, args, {
			cwd: UI_DIR,
			encoding: 'utf8',
			stdio: ['ignore', 'pipe', 'ignore']
		}).trim();
	} catch {
		return null;
	}
}

function exec(cmd: string, args: string[], env = process.env): void {
	execFileSync(cmd, args, { cwd: UI_DIR, env, stdio: 'inherit' });
}

export function build(): void {
	const env = Object.fromEntries(
		Object.entries(process.env).filter(([name]) => !TOKEN_VARIABLES.includes(name))
	);

	exec('npm', ['run', 'build'], env);
}

/** Refuses a tree with changes to the UI: a Space shows a commit. */
export function assertCleanUi(hint = ''): void {
	if (run('git', ['status', '--porcelain', '--', UI_ROOT])) {
		throw new Error(`the UI has uncommitted changes: commit them${hint}`);
	}
}

let token: string | undefined;

function hfHeaders(): { Authorization: string } {
	token ??= process.env.HF_TOKEN || tryRun('hf', ['auth', 'token']) || '';

	if (!token)
		throw new Error('not logged in to Hugging Face: run `hf auth login`, or set HF_TOKEN');

	return { Authorization: `Bearer ${token}` };
}

/** A GET on the Hub API; null when there is no such thing. */
export async function hub<T>(path: string): Promise<T | null> {
	const response = await fetch(`${HF_ENDPOINT}/api/${path}`, { headers: hfHeaders() });

	if (response.status === 404) return null;

	if (!response.ok) throw new Error(`Hugging Face answered ${response.status} for ${path}`);

	return (await response.json()) as T;
}

/** A Space, null when there is none. `tag` marks the Spaces a script made: it refuses any other. */
export async function getSpace(id: string, tag: string): Promise<Space | null> {
	const space = await hub<Space>(`spaces/${id}`);

	if (space && !space.tags?.includes(tag)) {
		throw new Error(`${id} exists without the ${tag} tag: it was not made by this script`);
	}

	return space;
}

export function spaceUrl(id: string, space: Space | null): string {
	return space?.host ?? `${HF_ENDPOINT}/spaces/${id}`;
}

/** The card of a Space, as text; '' when it cannot be read. */
export async function spaceReadme(id: string): Promise<string> {
	const response = await fetch(`${HF_ENDPOINT}/spaces/${id}/raw/main/README.md`, {
		headers: hfHeaders()
	});

	return response.ok ? response.text() : '';
}

/** The README of a static Space. Its headers are the ones llama-server serves the UI with (cross-origin isolation). */
export function staticSpaceCard(card: { body: string; tag: string; title: string }): string {
	return `---
title: ${card.title}
colorFrom: gray
colorTo: gray
sdk: static
pinned: false
tags:
  - ${card.tag}
custom_headers:
  cross-origin-embedder-policy: require-corp
  cross-origin-opener-policy: same-origin
---

${card.body}
`;
}

export interface SpaceUpload {
	card: string;
	id: string;
	message: string;
	/** the llama-server for config.json; without one the build's stays, which names its own origin */
	server?: string;
	/** set to create the Space first */
	visibility?: string;
}

/** Puts dist on a Space, with its card, and removes what the build no longer has. */
export function uploadSpace(upload: SpaceUpload): void {
	// staged in a copy, so the card does not end up in dist, which llama-server embeds
	const staged = mkdtempSync(join(tmpdir(), 'llama-ui-space-'));

	try {
		cpSync(DIST_DIR, staged, { recursive: true });
		writeFileSync(join(staged, 'README.md'), upload.card);

		if (upload.server) {
			// the app reads config.json on start
			writeFileSync(join(staged, 'config.json'), `${JSON.stringify({ server: upload.server })}\n`);
		}

		if (upload.visibility) {
			exec('hf', [
				'repos',
				'create',
				upload.id,
				'--repo-type',
				'space',
				'--space-sdk',
				'static',
				`--${upload.visibility}`
			]);
		}

		exec('hf', [
			'upload',
			upload.id,
			staged,
			'.',
			'--repo-type',
			'space',
			'--delete',
			'*',
			'--commit-message',
			upload.message
		]);
	} finally {
		rmSync(staged, { force: true, recursive: true });
	}
}

export function deleteSpace(id: string): void {
	exec('hf', ['repos', 'delete', id, '--repo-type', 'space', '--yes']);
}

/** Runs `main` when `url` is the script node was started with. Settings come from ui/apps/chat/.env. */
export function runMain(url: string, name: string, main: (argv: string[]) => Promise<void>): void {
	if (process.argv[1] !== fileURLToPath(url)) return;

	const envFile = join(UI_DIR, '.env');

	if (existsSync(envFile)) process.loadEnvFile(envFile);

	main(process.argv.slice(2)).catch((error: Error) => {
		console.error(`${name}: ${error.message}`);
		process.exit(1);
	});
}
