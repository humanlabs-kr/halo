import { OpenAPIRoute, contentJson } from 'chanfana';
import { z } from 'zod';
import type { AppContext } from 'workers/types';
import { ReceiptProcessor } from '../../services/receipt-processor';
import { R2 } from 'workers/utils/r2';
import { Synapse } from 'workers/services/synapse';
import { waitUntil } from 'cloudflare:workers';

export class ScanUploadReceipt extends OpenAPIRoute {
	schema = {
		tags: ['Scan'],
		summary: 'Upload receipt image',
		security: [{ cookie: [] }],
		request: {
			body: {
				required: true,
				content: {
					'multipart/form-data': {
						schema: z.object({
							file: z
								.custom<File>((v) => v instanceof File)
								.openapi({
									type: 'string',
									format: 'binary',
								}),
						}),
					},
				},
			},
		},
		responses: {
			'200': {
				description: 'Success',
				...contentJson(
					z.object({
						result: z.literal('success'),
					}),
				),
			},
			'400': {
				description: 'Bad Request',
				...contentJson(
					z.object({
						code: z.literal('BAD_REQUEST'),
						message: z.string(),
					}),
				),
			},
		},
	};

	async handle(c: AppContext) {
		const fd = await c.req.formData();
		const rawFile = fd.get('file');

		if (!rawFile || !(rawFile instanceof File)) {
			return c.json({ error: 'file must be a file' }, 400);
		}

		try {
			// Get image bytes
			const arrayBuffer = await rawFile.arrayBuffer();
			const inputBytes = new Uint8Array(arrayBuffer);

			const normalizedImage = ReceiptProcessor.normalizeImage(inputBytes);
			const db = c.get('db');

			waitUntil(
				(async () => {
					const synapseImageResult = await Synapse.saveReceiptImage(normalizedImage);
					// TODO save pieceCid to database
					console.log('synapseImageResult', synapseImageResult);
				})(),
			);
			waitUntil(
				(async () => {
					const r2ImageResult = await R2.saveReceiptImage(normalizedImage);
					console.log('r2ImageResult', r2ImageResult);
				})(),
			);

			waitUntil(
				(async () => {
					const receiptData = await ReceiptProcessor.process(normalizedImage);
					console.log('receiptData', receiptData);
				})(),
			);

			return c.json({
				result: 'success',
			});
		} catch (error) {
			console.error('Error processing receipt:', error);
			return c.json({ error: error instanceof Error ? error.message : 'Failed to process receipt' }, 500);
		}
	}
}
