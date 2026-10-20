// The two ends of the code handoff, exercised against each other: the QR the
// host screen draws is read back by the same native detector the phone's camera
// scanner uses. A change to the payload or to the rendering shows up here, and
// only here - everything else about the code is a unit test.

import { CODE_CHARS, CODE_LENGTHS } from '$lib/constants';
import { qrCodeDataUrl } from '$lib/utils/qr-code';
import { supportsQrScan } from '$lib/utils/qr-scan';
import { expect, it } from 'vitest';

/** A code of the right length, drawn from the alphabet llama-server generates from. */
const CODE = Array.from(
	{ length: CODE_LENGTHS.SHARE },
	(_, index) => CODE_CHARS[index % CODE_CHARS.length]
).join('');
/** Browsers that ship the detector the scanner uses; the rest skip the round trip. */
const canReadCodes = supportsQrScan();

interface BarcodeDetectorLike {
	detect(source: CanvasImageSource): Promise<Array<{ rawValue?: string }>>;
}

/** The payload the scanner reports for a rendered code, as a phone would see it. */
async function readBack(url: string): Promise<string | null> {
	const image = new Image();

	image.src = url;
	await image.decode();

	const canvas = document.createElement('canvas');

	canvas.width = 256;
	canvas.height = 256;

	const context = canvas.getContext('2d')!;

	context.fillStyle = '#ffffff';
	context.fillRect(0, 0, canvas.width, canvas.height);
	context.drawImage(image, 0, 0, canvas.width, canvas.height);

	const Detector = (
		window as unknown as {
			BarcodeDetector: new (options: { formats: string[] }) => BarcodeDetectorLike;
		}
	).BarcodeDetector;
	const [found] = await new Detector({ formats: ['qr_code'] }).detect(canvas);

	return found?.rawValue ?? null;
}

it.skipIf(!canReadCodes)('reads back the code the host screen shows', async () => {
	const url = qrCodeDataUrl(CODE);

	expect(url).not.toBeNull();
	expect(await readBack(url!)).toBe(CODE);
});
