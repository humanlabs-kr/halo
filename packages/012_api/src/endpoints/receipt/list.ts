import { OpenAPIRoute, contentJson } from 'chanfana';
import { z } from 'zod';
import type { AppContext } from 'workers/types';
import { desc, eq, receipts } from '@hl/database';

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
								currency: z.string(),
								totalAmount: z.number(),
								assignedPoint: z.number(),
								qualityRate: z.number(),
								createdAt: z.coerce.date(),
							}),
						),
					}),
				),
			},
		},
	};

	async handle(c: AppContext) {
		const userAddress = c.get('address');

		const receiptRecords = await c.get('db').query.receipts.findMany({
			columns: {
				id: true,
				merchantName: true,
				status: true,
				assignedPoint: true,
				currency: true,
				totalAmount: true,
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
				currency: receipt.currency,
				totalAmount: receipt.totalAmount,
				assignedPoint: receipt.assignedPoint,
				qualityRate: receipt.qualityRate,
				createdAt: receipt.createdAt,
			})),
		});
	}
}
