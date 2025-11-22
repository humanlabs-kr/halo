import { env } from 'cloudflare:workers';

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
		await Promise.allSettled(
			batch.messages.map((message) => {
				const params = message.body as Params;
				// return Synapse.saveReceiptImage(params.receiptImageId);
			}),
		);
	},
};
