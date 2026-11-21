/**
 * Access code scanning from the camera, without a dependency.
 *
 * Browsers that ship a native `BarcodeDetector` can read the QR code
 * `llama-server --connect` prints; everywhere else the field is filled by
 * hand, which is the same thing the user does when they copy the code from a
 * terminal. The code alphabet excludes the characters that a camera frame is
 * most likely to misread, so a miss is a length or charset failure and the
 * field simply stays invalid.
 */

/** Minimal shape of the native detector; it is not in every lib.dom. */
interface BarcodeDetectorLike {
	detect(source: CanvasImageSource): Promise<Array<{ rawValue?: string; value?: string }>>;
}

type BarcodeDetectorConstructor = new (options?: { formats?: string[] }) => BarcodeDetectorLike;

function detectorConstructor(): BarcodeDetectorConstructor | null {
	if (typeof window === 'undefined') return null;

	const candidate = (window as unknown as { BarcodeDetector?: BarcodeDetectorConstructor })
		.BarcodeDetector;

	return typeof candidate === 'function' ? candidate : null;
}

/** Whether this browser can read a QR code out of a camera frame. */
export function supportsQrScan(): boolean {
	return detectorConstructor() !== null;
}

/**
 * Read a QR code out of one video frame.
 *
 * @returns The decoded value, or null when the frame carries none.
 */
export async function scanFrameForCode(video: HTMLVideoElement): Promise<string | null> {
	const Detector = detectorConstructor();

	// HAVE_CURRENT_DATA and up: nothing to read out of an empty frame
	if (!Detector || video.readyState < 2) return null;

	try {
		const barcodes = await new Detector({ formats: ['qr_code'] }).detect(video);

		for (const barcode of barcodes) {
			const value = barcode.rawValue ?? barcode.value;

			if (value) return value;
		}

		return null;
	} catch {
		// a frame the detector cannot read is not an error worth surfacing
		return null;
	}
}
