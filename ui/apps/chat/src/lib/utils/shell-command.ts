/**
 * Shell command parsing for permission rules: splits a command into the
 * simple commands it runs, so a rule can allow `npm test` without allowing
 * `npm test && rm -rf build`. It is a matcher for prompts, not a sandbox:
 * anything it cannot read with confidence is reported as complex and always
 * asks.
 */

import type { ShellCommandParts } from '#lib/types/index.ts';

// operators that chain commands; longest first so `&&` wins over `&`
const CHAIN_OPERATORS = ['&&', '||', '|&', ';', '|', '&', '\n'];
// wrappers that run the command after them unchanged
const WRAPPERS = new Set(['command', 'nice', 'nohup', 'time', 'timeout']);
// commands whose second word picks the action, so a rule keeps it: `git log *`
const SUBCOMMAND_TOOLS = new Set([
	'bun',
	'cargo',
	'docker',
	'gh',
	'git',
	'go',
	'kubectl',
	'make',
	'npm',
	'npx',
	'pip',
	'pnpm',
	'podman',
	'python',
	'uv',
	'yarn'
]);
// package managers whose `run` takes the script as a third word: `npm run test *`
const RUN_SCRIPT_TOOLS = new Set(['bun', 'npm', 'pnpm', 'yarn']);
const MAX_COMMAND_LENGTH = 10_000;

/**
 * Split a command line into its simple commands. Quotes and backslashes are
 * honoured; `$(…)`, backticks, process substitution and unbalanced quotes
 * mark the result as complex.
 */
export function splitShellCommand(command: string): ShellCommandParts {
	const segments: string[] = [];

	let complex = command.length > MAX_COMMAND_LENGTH;
	let current = '';
	let quote: '"' | "'" | null = null;
	let i = 0;

	const flush = () => {
		const segment = normalizeSegment(current);

		if (segment) segments.push(segment);

		current = '';
	};

	while (i < command.length) {
		const ch = command[i];

		if (quote) {
			if (ch === '\\' && quote === '"' && i + 1 < command.length) {
				current += ch + command[i + 1];
				i += 2;

				continue;
			}

			if (ch === '$' && quote === '"' && command[i + 1] === '(') complex = true;

			if (ch === '`' && quote === '"') complex = true;

			if (ch === quote) quote = null;

			current += ch;
			i++;

			continue;
		}

		if (ch === '\\' && i + 1 < command.length) {
			// a backslash before a newline continues the line
			if (command[i + 1] !== '\n') current += ch + command[i + 1];

			i += 2;

			continue;
		}

		if (ch === "'" || ch === '"') {
			quote = ch;
			current += ch;
			i++;

			continue;
		}

		if (ch === '`' || (ch === '$' && command[i + 1] === '(')) complex = true;

		if ((ch === '<' || ch === '>') && command[i + 1] === '(') complex = true;

		if ((ch === '(' || ch === ')' || ch === '{' || ch === '}') && current.trim() === '')
			complex = true;

		const operator = CHAIN_OPERATORS.find((op) => command.startsWith(op, i));
		// `2>&1` and `>&` are redirections, not the `&` operator
		const isRedirectAmpersand = operator === '&' && /[<>]$/.test(current);

		if (operator && !isRedirectAmpersand) {
			flush();
			i += operator.length;

			continue;
		}

		current += ch;
		i++;
	}

	if (quote) complex = true;

	flush();

	return { complex: complex || segments.length === 0, segments };
}

/**
 * The words of a simple command, quotes removed. Good enough to match rules
 * and propose prefixes; not a full shell word expansion.
 */
export function shellWords(segment: string): string[] {
	const words: string[] = [];

	let word = '';
	let quote: '"' | "'" | null = null;
	let hasWord = false;

	for (let i = 0; i < segment.length; i++) {
		const ch = segment[i];

		if (quote) {
			if (ch === quote) quote = null;
			else if (ch === '\\' && quote === '"' && i + 1 < segment.length) word += segment[++i];
			else word += ch;

			continue;
		}

		if (ch === "'" || ch === '"') {
			quote = ch;
			hasWord = true;
		} else if (ch === '\\' && i + 1 < segment.length) {
			word += segment[++i];
			hasWord = true;
		} else if (/\s/.test(ch)) {
			if (hasWord) words.push(word);

			word = '';
			hasWord = false;
		} else {
			word += ch;
			hasWord = true;
		}
	}

	if (hasWord) words.push(word);

	return words;
}

/**
 * The command a segment runs once harmless wrappers are taken off:
 * `timeout 30 npm test` is matched as `npm test`.
 */
export function stripWrappers(segment: string): string {
	let words = shellWords(segment);

	while (words.length > 1 && WRAPPERS.has(words[0])) {
		const wrapper = words[0];

		words = words.slice(1);

		// options of the wrapper, and the duration of `timeout`
		while (words.length > 1 && words[0].startsWith('-')) {
			const option = words[0];

			words = words.slice(1);

			if (wrapper === 'nice' && option === '-n' && words.length > 1) words = words.slice(1);
		}

		if (wrapper === 'timeout' && words.length > 1 && /^\d+(\.\d+)?[smhd]?$/.test(words[0])) {
			words = words.slice(1);
		}
	}

	return words.join(' ');
}

/**
 * The prefix a rule should keep for a command: the program and, for tools
 * with subcommands, the subcommand (`git log *`, `npm run test *`).
 */
export function proposeShellPattern(segment: string): string {
	const words = shellWords(stripWrappers(segment));

	if (words.length === 0) return '';

	const isPlainWord = (word: string | undefined) =>
		!!word && /^[\w:@.-]+$/.test(word) && !word.startsWith('-') && !word.includes('/');
	const kept = [words[0]];

	if (SUBCOMMAND_TOOLS.has(words[0]) && isPlainWord(words[1])) {
		kept.push(words[1]);

		if (RUN_SCRIPT_TOOLS.has(words[0]) && words[1] === 'run' && isPlainWord(words[2])) {
			kept.push(words[2]);
		}
	}

	return kept.length === words.length ? kept.join(' ') : `${kept.join(' ')} *`;
}

/**
 * Whether a simple command matches a rule pattern. `*` matches any text; a
 * trailing ` *` also matches the bare command, so `git log *` matches
 * `git log`. The whole command must match.
 */
export function matchesShellPattern(segment: string, pattern: string): boolean {
	const command = stripWrappers(segment);
	const normalized = normalizeSegment(pattern);

	if (!normalized) return false;

	const optionalTail = normalized.endsWith(' *');
	const body = optionalTail ? normalized.slice(0, -2) : normalized;

	let source = body
		.split('*')
		.map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
		.join('.*');

	if (optionalTail) source += '(?: .*)?';

	return new RegExp(`^${source}$`, 's').test(command);
}

function normalizeSegment(segment: string): string {
	return segment.replace(/\s+/g, ' ').trim();
}
