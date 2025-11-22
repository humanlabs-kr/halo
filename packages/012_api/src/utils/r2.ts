import { env } from 'cloudflare:workers';
import { randomUUID } from 'crypto';

export const R2 = {
	saveReceiptImage: async (image: Uint8Array, key?: string): Promise<{ key: string }> => {
		try {
			const fileKey = key ?? randomUUID();
			const result = await env.RECEIPT_R2_BUCKET.put(fileKey, image, {
				httpMetadata: {
					contentType: 'image/jpeg',
				},
			});

			return {
				key: result.key,
			};
		} catch (error) {
			console.error('Error saving receipt image to R2:', error);
			throw error;
		}
	},
	downloadReceiptImage: async (key: string): Promise<Uint8Array> => {
		try {
			const result = await env.RECEIPT_R2_BUCKET.get(key);
			if (!result) {
				throw new Error('Receipt image not found');
			}
			return new Uint8Array(await result.arrayBuffer());
		} catch (error) {
			console.error('Error downloading receipt image from R2:', error);
			throw error;
		}
	},
};
