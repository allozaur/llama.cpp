import { applyCarriageReturns, parseAnsi, stripAnsi } from '#lib/utils/index.ts';
import { describe, expect, it } from 'vitest';

describe('parseAnsi', () => {
	it('keeps plain text as one unstyled run', () => {
		expect(parseAnsi('hello\nworld')).toEqual([{ style: {}, text: 'hello\nworld' }]);
	});

	it('turns SGR codes into styles and resets them', () => {
		expect(parseAnsi('\x1b[32m\x1b[1mVITE\x1b[22m ready\x1b[0m in 300 ms')).toEqual([
			{ style: { bold: true, fg: 2 }, text: 'VITE' },
			{ style: { bold: undefined, dim: undefined, fg: 2 }, text: ' ready' },
			{ style: {}, text: ' in 300 ms' }
		]);
	});

	it('reads bright, 256-colour and truecolour codes', () => {
		const runs = parseAnsi('\x1b[91ma\x1b[38;5;196mb\x1b[48;2;1;2;3mc');

		expect(runs.map((r) => r.style)).toEqual([
			{ fg: 9 },
			{ fg: 'rgb(255, 0, 0)' },
			{ bg: 'rgb(1, 2, 3)', fg: 'rgb(255, 0, 0)' }
		]);
	});

	it('drops cursor and OSC sequences', () => {
		expect(stripAnsi('\x1b[2K\x1b[1Gdone\x1b]0;title\x07!')).toBe('done!');
	});
});

describe('applyCarriageReturns', () => {
	it('keeps what a terminal shows after a lone carriage return', () => {
		expect(applyCarriageReturns('progress 10%\rprogress 100%\nnext')).toBe('progress 100%\nnext');
	});

	it('treats CRLF as a newline', () => {
		expect(applyCarriageReturns('a\r\nb\r\n')).toBe('a\nb\n');
	});
});
