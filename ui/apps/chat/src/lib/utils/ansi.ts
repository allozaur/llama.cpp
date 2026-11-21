/**
 * Terminal output to styled text runs: SGR colour and weight codes become
 * styles, every other escape sequence is dropped, and a carriage return
 * without a newline rewrites its line the way a terminal shows it.
 */

export interface AnsiStyle {
	/** A palette index 0-15, or a CSS colour for 256-colour and truecolour codes */
	fg?: number | string;
	bg?: number | string;
	bold?: boolean;
	dim?: boolean;
	italic?: boolean;
	underline?: boolean;
}

export interface AnsiRun {
	text: string;
	style: AnsiStyle;
}

// CSI sequences (ESC [ ... final byte), OSC sequences (ESC ] ... BEL or ESC \) and two-byte escapes
// eslint-disable-next-line no-control-regex
const ESCAPE_REGEX = /\x1b\[([0-9;?]*)([@-~])|\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)|\x1b[@-Z\\-_]/g;

/** Keep what a terminal shows of each line: the text after its last lone carriage return. */
export function applyCarriageReturns(text: string): string {
	if (!text.includes('\r')) return text;

	return text
		.replace(/\r\n/g, '\n')
		.split('\n')
		.map((line) => {
			const at = line.lastIndexOf('\r', line.length - 2);

			return (at >= 0 ? line.slice(at + 1) : line).replace(/\r$/, '');
		})
		.join('\n');
}

/** Text without escape sequences, for copying and searching. */
export function stripAnsi(text: string): string {
	return applyCarriageReturns(text).replace(ESCAPE_REGEX, '');
}

function xterm256(n: number): number | string {
	if (n < 16) return n;

	if (n >= 232) {
		const level = 8 + (n - 232) * 10;

		return `rgb(${level}, ${level}, ${level})`;
	}

	const i = n - 16;
	const steps = [0, 95, 135, 175, 215, 255];

	return `rgb(${steps[Math.floor(i / 36)]}, ${steps[Math.floor(i / 6) % 6]}, ${steps[i % 6]})`;
}

/** Read an extended colour (38;5;n or 38;2;r;g;b) from codes[i], returning the colour and the next index. */
function extendedColour(codes: number[], i: number): [number | string | undefined, number] {
	if (codes[i + 1] === 5 && codes[i + 2] !== undefined) return [xterm256(codes[i + 2]), i + 3];

	if (codes[i + 1] === 2 && codes[i + 4] !== undefined) {
		return [`rgb(${codes[i + 2]}, ${codes[i + 3]}, ${codes[i + 4]})`, i + 5];
	}

	return [undefined, i + 1];
}

function applySgr(style: AnsiStyle, params: string): AnsiStyle {
	const codes = params === '' ? [0] : params.split(';').map((p) => Number.parseInt(p || '0', 10));

	let next: AnsiStyle = { ...style };
	let i = 0;

	while (i < codes.length) {
		const code = codes[i];

		if (code === 0) next = {};
		else if (code === 1) next.bold = true;
		else if (code === 2) next.dim = true;
		else if (code === 3) next.italic = true;
		else if (code === 4) next.underline = true;
		else if (code === 22) next.bold = next.dim = undefined;
		else if (code === 23) next.italic = undefined;
		else if (code === 24) next.underline = undefined;
		else if (code >= 30 && code <= 37) next.fg = code - 30;
		else if (code >= 90 && code <= 97) next.fg = code - 90 + 8;
		else if (code === 39) next.fg = undefined;
		else if (code >= 40 && code <= 47) next.bg = code - 40;
		else if (code >= 100 && code <= 107) next.bg = code - 100 + 8;
		else if (code === 49) next.bg = undefined;
		else if (code === 38 || code === 48) {
			const [colour, after] = extendedColour(codes, i);

			if (colour !== undefined) {
				if (code === 38) next.fg = colour;
				else next.bg = colour;
			}

			i = after;

			continue;
		}

		i++;
	}

	return next;
}

/** Split terminal output into runs of equally styled text. */
export function parseAnsi(text: string): AnsiRun[] {
	const source = applyCarriageReturns(text);
	const runs: AnsiRun[] = [];

	let style: AnsiStyle = {};
	let last = 0;

	const push = (chunk: string) => {
		if (!chunk) return;

		const prev = runs[runs.length - 1];

		if (prev && prev.style === style) prev.text += chunk;
		else runs.push({ style, text: chunk });
	};

	for (const match of source.matchAll(ESCAPE_REGEX)) {
		push(source.slice(last, match.index));
		last = match.index + match[0].length;

		if (match[2] === 'm' && !match[1]?.startsWith('?')) style = applySgr(style, match[1] ?? '');
	}

	push(source.slice(last));

	return runs;
}
