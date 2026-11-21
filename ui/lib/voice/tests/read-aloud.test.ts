// Guards how voice mode reads a streaming reply aloud: whole sentences as soon as they are
// complete, the rest once the reply is done, without markdown marks, with offsets into the
// reply as written so the text on screen can follow the voice.

import { readAloudPieces, toSpeech } from '../src/index.js';
import { describe, expect, it } from 'vitest';

describe('readAloudPieces', () => {
	it('reads complete sentences while the reply streams', () => {
		const text = 'Sure, here you go. The first one is';
		const pieces = readAloudPieces(text, 0, false);

		expect(pieces.map((piece) => piece.speech)).toEqual(['Sure, here you go.']);
		expect(text.slice(pieces[0].start, pieces[0].end)).toBe('Sure, here you go.');
	});

	it('reads the rest once the reply is done, from where it left off', () => {
		const text = 'Sure, here you go. The first one is short';
		const [first] = readAloudPieces(text, 0, false);
		const rest = readAloudPieces(text, first.end, true);

		expect(rest.map((piece) => piece.speech)).toEqual(['The first one is short']);
		expect(rest[0].end).toBe(text.length);
	});

	it('does not end a sentence at a list number, and reads lines on their own', () => {
		const text = 'Jokes:\n1. Why are fish clever? They live in schools.\n2. Next';
		// a bare line break is a piece with nothing to say: it only moves the reading on
		const pieces = readAloudPieces(text, 0, true)
			.map((piece) => piece.speech)
			.filter(Boolean);

		expect(pieces).toEqual(['Jokes:', 'Why are fish clever?', 'They live in schools.', 'Next']);
	});
});

describe('the first piece', () => {
	it('may end at a clause, so the voice starts before the sentence is done', () => {
		const text = 'Quantum physics describes how very small things, like electrons and photons';
		const [first] = readAloudPieces(text, 0, false, true);

		expect(first.speech).toBe('Quantum physics describes how very small things,');
		// later pieces wait for whole sentences
		expect(readAloudPieces(text, first.end, false)).toEqual([]);
	});

	it('waits for the sentence when its first clause is short', () => {
		expect(readAloudPieces('Sure, here are ten jokes about', 0, false, true)).toEqual([]);
	});
});

describe('toSpeech', () => {
	it('leaves out markdown marks', () => {
		expect(toSpeech('## **Quantization.** Some `values`, see [the docs](https://x.y).')).toBe(
			'Quantization. Some values, see the docs.'
		);
		expect(toSpeech('```js\nconst a = 1;\n```')).toBe('');
	});
});
