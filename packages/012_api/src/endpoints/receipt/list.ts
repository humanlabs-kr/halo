import { OpenAPIRoute, contentJson } from 'chanfana';
import { z } from 'zod';
import type { AppContext } from 'workers/types';
import { ReceiptProcessor } from '../../services/receipt-processor';
import { R2 } from 'workers/utils/r2';
import { waitUntil } from 'cloudflare:workers';
import { desc, eq, receiptImages, receipts } from '@hl/database';
import { randomUUID } from 'crypto';
import { FluenceOcrQueue, ReceiptAnalysisQueue, SynapseUploadQueue } from 'workers/queues';

export class ListReceipts extends OpenAPIRoute {
	schema = {
		tags: ['Receipt'],
		summary: 'List receipts',
		security: [{ cookie: [] }],
		responses: {
			'200': {
				description: 'Success',
				...contentJson(
					z.object({
						totalCount: z.number(),
						list: z.array(
							z.object({
								id: z.string(),
								merchantName: z.string(),
								status: z.enum(['pending', 'rejected', 'claimable', 'claimed']),
								assignedPoint: z.number(),
								qualityRate: z.number(),
								createdAt: z.coerce.date(),
							}),
						),
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

		const receiptRecords = await c.get('db').query.receipts.findMany({
			columns: {
				id: true,
				merchantName: true,
				status: true,
				assignedPoint: true,
				qualityRate: true,
				createdAt: true,
			},
			where: eq(receipts.userAddress, userAddress),
			orderBy: [desc(receipts.createdAt)],
		});

		return c.json({
			totalCount: receiptRecords.length,
			list: receiptRecords.map((receipt) => ({
				id: receipt.id,
				merchantName: receipt.merchantName,
				status: receipt.status,
				assignedPoint: receipt.assignedPoint,
				qualityRate: receipt.qualityRate,
				createdAt: receipt.createdAt,
			})),
		});
	}
}
