// Guards the other end of the code scanner: what the host screen shows must be
// the payload the camera accepts, and nothing else. A QR that carries a URL, or
// a half-typed code, scans into a pairing that cannot work.

import { CODE_CHARS, CODE_LENGTHS } from '$lib/constants';
import { qrCodeDataUrl } from '$lib/utils/qr-code';
import { describe, expect, it } from 'vitest';

/** A code of the right length, drawn from the alphabet llama-server generates from. */
const CODE = Array.from(
	{ length: CODE_LENGTHS.SHARE },
	(_, index) => CODE_CHARS[index % CODE_CHARS.length]
).join('');
/** The same alphabet, shifted: a different code of the same shape. */
const OTHER = Array.from(
	{ length: CODE_LENGTHS.SHARE },
	(_, index) => CODE_CHARS[(index + 7) % CODE_CHARS.length]
).join('');
/** Module size the renderer draws with, in SVG units. */
const PIXEL_SIZE = 4;

function svgOf(url: string | null): string {
	expect(url).not.toBeNull();

	return decodeURIComponent(url!.split(',')[1]);
}

describe('access code QR', () => {
	it('renders the code as an SVG data URL', () => {
		const svg = svgOf(qrCodeDataUrl(CODE));

		expect(svg.startsWith('<svg')).toBe(true);
		expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
	});

	it('pins dark modules on a light field, whatever the theme', () => {
		const svg = svgOf(qrCodeDataUrl(CODE));

		expect(svg).toContain('fill="#ffffff"');
		expect(svg).toContain('fill="#000000"');
	});

	it('sizes the code for a whole access code, not a fragment', () => {
		const svg = svgOf(qrCodeDataUrl(CODE));
		const side = Number(/viewBox="0 0 (\d+)/.exec(svg)?.[1]) / PIXEL_SIZE;

		// 40 bytes at ECC M land in version 3: 29 modules, plus the 4 module quiet zone
		expect(side).toBe(37);
	});

	it('carries the code the scanner accepts, spacing and all', () => {
		const spaced = `${CODE.slice(0, 8)} ${CODE.slice(8, 20)}\n${CODE.slice(20)}`;

		expect(qrCodeDataUrl(spaced)).toBe(qrCodeDataUrl(CODE));
	});

	it('encodes the code it was handed', () => {
		expect(qrCodeDataUrl(OTHER)).not.toBe(qrCodeDataUrl(CODE));
	});

	it('renders nothing for a value that is not a code', () => {
		expect(qrCodeDataUrl('')).toBeNull();
		expect(qrCodeDataUrl('not a code')).toBeNull();
		expect(qrCodeDataUrl(CODE.slice(0, CODE_LENGTHS.SHARE - 1))).toBeNull();
	});
});
