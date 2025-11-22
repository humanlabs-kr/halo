import { OpenAPIRoute, contentJson } from 'chanfana';
import { z } from 'zod';
import type { AppContext } from 'workers/types';
import { ReceiptProcessor } from '../../services/receipt-processor';
import { R2 } from 'workers/utils/r2';
import { Synapse } from 'workers/services/synapse';
import { waitUntil } from 'cloudflare:workers';
import { eq, receiptImages, receipts } from '@hl/database';
import { randomUUID } from 'crypto';

export class ScanUploadReceipt extends OpenAPIRoute {
	schema = {
		tags: ['Receipt'],
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
		const data = await this.getValidatedData<typeof this.schema>();
		const userAddress = c.get('address');
		// TODO check if user can upload receipt

		const fd = await c.req.formData();
		const rawFile = fd.get('file');

		if (!rawFile || !(rawFile instanceof File)) {
			return c.json({ error: 'file must be a file' }, 400);
		}

		const { receiptId, receiptImageIds } = await c.get('db').transaction(async (tx) => {
			// create a receipt row
			const receiptId = randomUUID();
			await tx.insert(receipts).values({
				id: receiptId,
				userAddress,
			});

			// TODO create many receipt images rows after we support multiple images per receipt
			const receiptImageIds = [randomUUID()];

			await tx.insert(receiptImages).values(
				receiptImageIds.map((id, index) => ({
					id,
					receiptId,
					numOrder: index,
				})),
			);

			return {
				receiptId,
				receiptImageIds,
			};
		});

		// upload to r2 for use after in AI and synapse
		const arrayBuffer = await rawFile.arrayBuffer();
		const inputBytes = new Uint8Array(arrayBuffer);
		// const normalizedImage = ReceiptProcessor.normalizeImage(inputBytes);

		const r2ImageResult = await R2.saveReceiptImage(inputBytes);

		await c
			.get('db')
			.update(receiptImages)
			.set({
				r2Key: r2ImageResult.key,
			})
			.where(eq(receiptImages.id, receiptImageIds[0]));

		// Send to queue for AI

		// send to queue for synapse, (for synapse, iterate over each receipt image ids)

		return c.json({
			result: 'success',
		});

		// try {
		// 	// Get image bytes

		// 	waitUntil(
		// 		(async () => {
		// 			const synapseImageResult = await Synapse.saveReceiptImage(normalizedImage);
		// 			// TODO save pieceCid to database
		// 			console.log('synapseImageResult', synapseImageResult);
		// 		})(),
		// 	);

		// 	waitUntil(
		// 		(async () => {
		// 			const receiptData = await ReceiptProcessor.process(normalizedImage);
		// 			console.log('receiptData', receiptData);
		// 		})(),
		// 	);

		// 	return c.json({
		// 		result: 'success',
		// 	});
		// } catch (error) {
		// 	console.error('Error processing receipt:', error);
		// 	return c.json({ error: error instanceof Error ? error.message : 'Failed to process receipt' }, 500);
		// }
	}
}
