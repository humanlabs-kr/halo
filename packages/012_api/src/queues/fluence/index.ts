import { eq, receiptImages } from '@hl/database';
import { env } from 'cloudflare:workers';
import { FluenceOcr } from 'workers/services/fluence';
import { useDB } from 'workers/utils/db';
import { R2 } from 'workers/utils/r2';

type Params = {
	receiptImageId: string;
};

export const FluenceOcrQueue = {
	name: 'fluence-ocr',
	send: async (params: Params) => {
		await env.FLUENCE_OCR_QUEUE.send(params, {
			contentType: 'json',
		});
	},
	run: async (batch: MessageBatch, env: Env, ctx: ExecutionContext) => {
		console.log('Fluence OCR message:', batch.messages);
		const db = useDB();

		await Promise.allSettled(
			batch.messages.map(async (message) => {
				const params = message.body as Params;
				try {
					await db
						.update(receiptImages)
						.set({
							fluenceOcrStartedAt: new Date(),
							fluenceOcrError: null,
						})
						.where(eq(receiptImages.id, params.receiptImageId));

					const imageBytes = await R2.downloadReceiptImage(params.receiptImageId);

					const fluenceResult = await FluenceOcr.runOcrImage(imageBytes);

					await db
						.update(receiptImages)
						.set({
							fluenceOcrResult: fluenceResult,
							fluenceOcrCompletedAt: new Date(),
							fluenceOcrError: null,
						})
						.where(eq(receiptImages.id, params.receiptImageId));

					console.log('Fluence OCR completed for receipt image:', params.receiptImageId);
				} catch (error: any) {
					console.error('Fluence OCR failed for receipt image:', error);
					await db
						.update(receiptImages)
						.set({
							fluenceOcrError: error.message,
							fluenceOcrCompletedAt: new Date(),
						})
						.where(eq(receiptImages.id, params.receiptImageId));

					// TODO rethrow if retry is needed
				}
			}),
		);
	},
};
