import { CommandWordKind } from '../enums';

const SPACES = /( +)/;
const PIPE = '|';
const FLAG_PREFIX = '-';

export interface CommandWord {
	kind: CommandWordKind;
	text: string;
}

/**
* Splits a one-line shell command into words for highlighting: the programs (the first word, and the first after a
* pipe), the flags and the pipes. Runs of spaces are words too, so joining the texts gives the command back.
* It splits on spaces only: quoting and other shell syntax are not parsed.
*/
export function splitCommand(command: string): CommandWord[] {
	let expectProgram = true;

	return command
		.split(SPACES)
		.filter((text) => text !== '')
		.map((text) => {
			let kind = CommandWordKind.ARGUMENT;

			if (text.trim() === '') {
				kind = CommandWordKind.SPACE;
			} else if (text === PIPE) {
				kind = CommandWordKind.PIPE;
			} else if (expectProgram) {
				kind = CommandWordKind.PROGRAM;
			} else if (text.startsWith(FLAG_PREFIX)) {
				kind = CommandWordKind.FLAG;
			}

			if (kind !== CommandWordKind.SPACE) {
				expectProgram = kind === CommandWordKind.PIPE;
			}

			return { kind, text };
		});
}
