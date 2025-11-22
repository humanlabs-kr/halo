import { eq, receiptImages } from '@hl/database';
import { env } from 'cloudflare:workers';
import { Synapse } from 'workers/services/synapse';
import { useDB } from 'workers/utils/db';
import { R2 } from 'workers/utils/r2';

type Params = {
	receiptImageId: string;
};

export const SynapseUploadQueue = {
	name: 'synapse-upload',
	send: async (params: Params) => {
		await env.RECEIPT_SYNAPSE_UPLOAD_QUEUE.send(params, {
			contentType: 'json',
		});
	},
	run: async (batch: MessageBatch, env: Env, ctx: ExecutionContext) => {
		console.log('Synapse upload message:', batch.messages);
		const results = await Promise.allSettled(
			batch.messages.map(async (message) => {
				const params = message.body as Params;

				const db = useDB();

				try {
					await db
						.update(receiptImages)
						.set({
							synapseUploadStartedAt: new Date(),
							synapseUploadError: null,
						})
						.where(eq(receiptImages.id, params.receiptImageId));

					const imageBytes = await R2.downloadReceiptImage(params.receiptImageId);

					const synapseResult = await Synapse.saveReceiptImage(imageBytes);

					console.log(synapseResult);

					await db
						.update(receiptImages)
						.set({
							synapseUploadCompletedAt: new Date(),
							synapseUploadError: null,
							synapsePieceCid: synapseResult.pieceCid.toString(),
						})
						.where(eq(receiptImages.id, params.receiptImageId));

					console.log('Upload to Synapse completed for receipt image:', params.receiptImageId);
				} catch (error: any) {
					console.error('Upload to Synapse failed for receipt image:', error);
					await db
						.update(receiptImages)
						.set({
							synapseUploadCompletedAt: new Date(),
							synapseUploadError: error.message,
						})
						.where(eq(receiptImages.id, params.receiptImageId));

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
