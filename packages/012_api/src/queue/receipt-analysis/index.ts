import { env } from 'cloudflare:workers';

type Params = {
	receiptId: string;
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
		await Promise.allSettled(
			batch.messages.map((message) => {
				const params = message.body as Params;
				console.log('Receipt analysis message:', params);
			}),
		);
	},
};
