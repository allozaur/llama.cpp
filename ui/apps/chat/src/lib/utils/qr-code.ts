/**
 * QR code of an access code, for carrying it from the screen it is shown on to
 * the camera of another device.
 *
 * The payload is the code itself, in the shape the scanner accepts: the scanner
 * hands whatever it decodes to `normalizeShareCode`, so a code pasted by hand
 * and a code scanned off a screen go through the same door.
 */

import { normalizeShareCode } from './server';
import { renderSVG } from 'uqr';

/** Module size of the rendered code, in SVG units. The image is sized by CSS. */
const PIXEL_SIZE = 4;
/** Quiet zone, in modules on each side; the spec asks for four, a camera needs them. */
const BORDER = 4;

/**
 * Data URL of an SVG QR code carrying the access code, or null when the value
 * is not a usable code: a QR a phone cannot pair with is worse than no QR.
 *
 * Black on white, pinned: a scanner reads dark modules on a light field, and
 * the app's dark theme must not invert that.
 */
export function qrCodeDataUrl(code: string): string | null {
	const normalized = normalizeShareCode(code);

	if (!normalized) return null;

	const svg = renderSVG(normalized, {
		blackColor: '#000000',
		border: BORDER,
		ecc: 'M',
		pixelSize: PIXEL_SIZE,
		whiteColor: '#ffffff'
	});

	return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
