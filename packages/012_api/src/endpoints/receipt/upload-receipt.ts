import { OpenAPIRoute, contentJson } from 'chanfana';
import { z } from 'zod';
import type { AppContext } from 'workers/types';
import { ReceiptProcessor } from '../../services/receipt-processor';
import { R2 } from 'workers/utils/r2';
import { waitUntil } from 'cloudflare:workers';
import { receiptImages, receipts } from '@hl/database';
import { randomUUID } from 'crypto';
import { FluenceOcrQueue, ReceiptAnalysisQueue, SynapseUploadQueue } from 'workers/queues';
import KSUID from 'ksuid';

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
		const { country } = (c.req.raw as any).cf;

		const userAddress = c.get('address');
		// TODO check if user can upload receipt

		const fd = await c.req.formData();
		const rawFile = fd.get('file');

		if (!rawFile || !(rawFile instanceof File)) {
			return c.json({ error: 'file must be a file' }, 400);
		}

		const { receiptId, receiptImageIds } = await c.get('db').transaction(async (tx) => {
			// create a receipt row
			const receiptId = KSUID.randomSync().string;
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
		const normalizedImage = ReceiptProcessor.normalizeImage(inputBytes);

		await R2.saveReceiptImage(normalizedImage, receiptImageIds[0]);

		// Send to queue for AI
		waitUntil(
			ReceiptAnalysisQueue.send({
				receiptId,
				country,
			}),
		);

		// send to queue for synapse, (for synapse, iterate over each receipt image ids)
		waitUntil(
			SynapseUploadQueue.send({
				receiptImageId: receiptImageIds[0],
			}),
		);

		// send to queue for fluence OCR, (for fluence OCR, iterate over each receipt image ids)
		waitUntil(
			FluenceOcrQueue.send({
				receiptImageId: receiptImageIds[0],
			}),
		);

		return c.json({
			result: 'success',
		});
	}
}
