import { PhotonImage, resize, SamplingFilter, sharpen } from '@cf-wasm/photon';

const MAX_LONG_EDGE = 1280;
const JPEG_QUALITY = 90;

export const normalizeReceiptImage = (rawFile: Uint8Array<ArrayBufferLike>) => {
	let image = PhotonImage.new_from_byteslice(rawFile);

	const width = image.get_width();
	const height = image.get_height();
	const maxDimension = Math.max(width, height);

	if (maxDimension > MAX_LONG_EDGE) {
		const scale = MAX_LONG_EDGE / maxDimension;
		const newWidth = Math.round(width * scale);
		const newHeight = Math.round(height * scale);

		image = resize(image, newWidth, newHeight, SamplingFilter.Lanczos3);
		// CAUTION: Do not sharpen or manipulate the image or else the AI will not be able to extract the data correctly
	}

	const jpegBytes = image.get_bytes_jpeg(JPEG_QUALITY);

	image.free();

	return jpegBytes;
};
