/**
 * Cuts a reply into pieces to read aloud while it streams: whole sentences (or lines),
 * each read as soon as it is complete, and the rest once the reply is done. Markdown
 * marks are left out of what is spoken; the offsets point into the reply as written,
 * so the text on screen can follow the voice.
 */

export interface ReadAloudPiece {
	/** Where the piece starts and ends in the reply as written */
	start: number;
	end: number;
	/** What is spoken: the piece without markdown marks */
	speech: string;
}

// a sentence ends at . ! ? (with closing quotes or brackets) before whitespace, or a line ends;
// a list number such as "1." does not end one
const PIECE_END = /(?<!(?:^|\s)\d{1,3})[.!?…]+["')\]*_]*(?=\s)|\n+/g;

/**
 * The pieces of `text` after `from` that are complete: the reply may still grow unless
 * `done`, in which case what remains is the last piece.
 */
export function readAloudPieces(text: string, from: number, done: boolean): ReadAloudPiece[] {
	const pieces: ReadAloudPiece[] = [];

	let start = from;

	PIECE_END.lastIndex = from;

	for (let match = PIECE_END.exec(text); match; match = PIECE_END.exec(text)) {
		const end = match.index + match[0].length;

		push(pieces, text, start, end);
		start = end;
	}

	if (done && start < text.length) push(pieces, text, start, text.length);

	return pieces;
}

function push(pieces: ReadAloudPiece[], text: string, start: number, end: number): void {
	const speech = toSpeech(text.slice(start, end));

	// a piece with nothing to say (a rule, a bare list number) still moves the reading on
	pieces.push({ end, speech, start });
}

/** Text as it should sound: no markdown emphasis, headings, code fences, links or list marks. */
export function toSpeech(text: string): string {
	return text
		.replace(/```[\s\S]*?```/g, ' ')
		.replace(/`([^`]*)`/g, '$1')
		.replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
		.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
		.replace(/^\s{0,3}(#{1,6}|>|[-*+]|\d+[.)])\s+/gm, '')
		.replace(/[*_~]{1,3}([^*_~]+)[*_~]{1,3}/g, '$1')
		.replace(/\s+/g, ' ')
		.trim();
}
