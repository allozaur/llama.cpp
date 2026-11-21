import { NOTE_TITLE_MAX_LENGTH, UNTITLED_NOTE } from '#lib/constants/index.ts';

const HEADING_MARKER = /^#{1,6}\s+/;

/** A note's title: its first line with text, without a heading marker. */
export function noteTitle(content: string): string {
	for (const line of content.split('\n')) {
		const text = line.trim().replace(HEADING_MARKER, '').trim();

		if (text) {
			return text.length > NOTE_TITLE_MAX_LENGTH
				? `${text.slice(0, NOTE_TITLE_MAX_LENGTH).trimEnd()}...`
				: text;
		}
	}

	return UNTITLED_NOTE;
}
