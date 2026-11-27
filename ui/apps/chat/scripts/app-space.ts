/**
 * Llama Chat on its own Space: puts the build on the static Hugging Face Space that HF_SPACE_UI_CHAT names.
 * The Space serves the app alone, with no llama-server. A custom domain is set in the Space's settings.
 *
 *   node scripts/app-space.ts    build and deploy, creating the Space if needed
 */

import {
	assertCleanUi,
	build,
	DEFAULT_VISIBILITY,
	getSpace,
	run,
	runMain,
	SERVER_URL_REGEX,
	SHORT_SHA_LENGTH,
	SPACE_ID_REGEX,
	spaceUrl,
	staticSpaceCard,
	uploadSpace,
	VISIBILITIES
} from './hf-space.ts';
import { parseArgs } from 'node:util';

const SPACE_VARIABLE = 'HF_SPACE_UI_CHAT';
const DEFAULT_APP_TITLE = 'Llama Chat';
// marks the Spaces this script made: it never deploys to any other
const APP_TAG = 'llama-ui-app';

export const USAGE = `Usage: npm run space:app -- [options]

Builds Llama Chat and deploys it to its Space, creating the Space if needed.

Options:
  --space <owner/name> the Space (default: ${SPACE_VARIABLE})
  --title <title>      the title on the Space's card (default: ${DEFAULT_APP_TITLE})
  --server <url>       a llama-server the app talks to, in its config.json (default: none)
  --visibility <v>     ${VISIBILITIES.join(', ')}; used when the Space is created (default: ${DEFAULT_VISIBILITY})
  --built              deploy dist as it is, without building
  -h, --help           print this help`;

export interface AppSpaceOptions {
	built: boolean;
	help: boolean;
	server?: string;
	space: string;
	title: string;
	visibility: string;
}

export function parseAppSpaceArgs(
	argv: string[],
	env: Record<string, string | undefined> = process.env
): AppSpaceOptions {
	const { values } = parseArgs({
		args: argv,
		options: {
			built: { default: false, type: 'boolean' },
			help: { default: false, short: 'h', type: 'boolean' },
			server: { type: 'string' },
			space: { type: 'string' },
			title: { default: DEFAULT_APP_TITLE, type: 'string' },
			visibility: { default: DEFAULT_VISIBILITY, type: 'string' }
		}
	});
	const space = values.space ?? env[SPACE_VARIABLE] ?? '';

	if (!values.help && !SPACE_ID_REGEX.test(space)) {
		throw new Error(`name the Space as <owner>/<name>, with --space or ${SPACE_VARIABLE}`);
	}

	if (values.server !== undefined && !SERVER_URL_REGEX.test(values.server)) {
		throw new Error('--server is an http(s) URL');
	}

	if (!VISIBILITIES.includes(values.visibility)) {
		throw new Error(`--visibility is one of: ${VISIBILITIES.join(', ')}`);
	}

	return {
		built: values.built,
		help: values.help,
		server: values.server,
		space,
		title: values.title,
		visibility: values.visibility
	};
}

/** The README of the Space: `repo` is the GitHub repository it was built from, '' when unknown. */
export function appSpaceCard(info: { repo: string; sha: string; title: string }): string {
	const source = info.repo ? `[${info.repo}](https://github.com/${info.repo})` : 'llama.cpp';

	return staticSpaceCard({
		body: `Llama Chat, the chat app of llama.cpp, built from ${source} at ${info.sha.slice(0, SHORT_SHA_LENGTH)}.

It has no server of its own: it talks to a llama-server you connect it to.`,
		tag: APP_TAG,
		title: info.title
	});
}

export async function main(argv: string[]): Promise<void> {
	const opts = parseAppSpaceArgs(argv);

	if (opts.help) {
		console.log(USAGE);

		return;
	}

	const space = await getSpace(opts.space, APP_TAG);

	// a workflow has just checked out the commit
	if (!process.env.CI) assertCleanUi();

	if (!opts.built) build();

	const repo = process.env.GITHUB_REPOSITORY ?? '';
	const sha = run('git', ['rev-parse', 'HEAD']);

	uploadSpace({
		card: appSpaceCard({ repo, sha, title: opts.title }),
		id: opts.space,
		message: `${opts.title} at ${sha.slice(0, SHORT_SHA_LENGTH)}`,
		server: opts.server,
		visibility: space ? undefined : opts.visibility
	});

	console.log(`\n${opts.space} is at ${spaceUrl(opts.space, await getSpace(opts.space, APP_TAG))}`);
}

runMain(import.meta.url, 'space:app', main);
