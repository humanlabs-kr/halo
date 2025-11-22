import { eq, receiptImages, receipts } from '@hl/database';
import { env } from 'cloudflare:workers';
import { ReceiptProcessor } from 'workers/services/receipt-processor';
import { useDB } from 'workers/utils/db';
import { R2 } from 'workers/utils/r2';

type Params = {
	receiptId: string;
	country: string; // ISO 3166-1 Alpha 2 code
};

export const ReceiptAnalysisQueue = {
	name: 'receipt-analysis',
	send: async (params: Params) => {
		await env.RECEIPT_ANALYSIS_QUEUE.send(params, {
			contentType: 'json',
		});
	},
	run: async (batch: MessageBatch, env: Env, ctx: ExecutionContext) => {
		console.log('Receipt analysis message:', batch.messages);
		const results = await Promise.allSettled(
			batch.messages.map(async (message) => {
				const params = message.body as Params;

				const db = useDB();
				try {
					await db
						.update(receipts)
						.set({
							analysisStartedAt: new Date(),
							analysisError: null,
						})
						.where(eq(receipts.id, params.receiptId));

					const receiptImageRecords = await db.query.receiptImages.findMany({
						columns: {
							id: true,
						},
						where: eq(receiptImages.receiptId, params.receiptId),
					});

					if (receiptImageRecords.some((receiptImage) => !receiptImage.id)) {
						console.error('Receipt image not found in R2');
						throw new Error('Some receipt images not found in R2');
					}

					const receiptImageDataArray = await Promise.all(
						receiptImageRecords.map(async (receiptImage) => {
							const imageBytes = await R2.downloadReceiptImage(receiptImage.id);
							return imageBytes;
						}),
					);

					const receiptData = await ReceiptProcessor.process(receiptImageDataArray, params.country);

					await db
						.update(receipts)
						.set({
							merchantName: receiptData.merchantName,
							issuedAt: receiptData.issuedAt,
							countryCode: receiptData.countryCode,
							currency: receiptData.currency,
							totalAmount: receiptData.totalAmount ? receiptData.totalAmount.toFixed(2) : null,
							paymentMethod: receiptData.paymentMethod,
							qualityRate: receiptData.qualityRate,

							analysisCompletedAt: new Date(),
							analysisError: null,
						})
						.where(eq(receipts.id, params.receiptId));

					console.log('Receipt analysis completed for receipt:', params.receiptId);
				} catch (error: any) {
					console.error('Receipt analysis failed for receipt:', error);
					await db
						.update(receipts)
						.set({
							analysisCompletedAt: new Date(),
							analysisError: error.message,
						})
						.where(eq(receipts.id, params.receiptId));

					// rethrow to trigger retry
					throw error;
				}
			}),
		);

		const failedIndices = results.map((result, index) => (result.status === 'rejected' ? index : false)).filter((i) => i !== false);
		if (failedIndices.length > 0) {
			for (const index of failedIndices) {
				batch.messages[index].retry({ delaySeconds: 10 });
			}
		}
	},
};
