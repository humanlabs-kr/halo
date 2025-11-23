import { OpenAPIRoute, contentJson } from 'chanfana';
import { z } from 'zod';
import type { AppContext } from 'workers/types';
import { desc, eq, receipts } from '@hl/database';

export class ReceiptById extends OpenAPIRoute {
	schema = {
		tags: ['Receipt'],
		summary: 'Get receipt by id',
		security: [{ cookie: [] }],
		request: {
			params: z.object({
				receiptId: z.string(),
			}),
		},
		responses: {
			'200': {
				description: 'Success',
				...contentJson(
					z.object({
						id: z.string(),
						merchantName: z.string(),
						status: z.enum(['rejected', 'claimable', 'claimed']),
						currency: z.string(),
						totalAmount: z.number(),
						issuedAt: z.coerce.date(),
						countryCode: z.string(),
						paymentMethod: z.string(),
						qualityRate: z.number(),
						assignedPoint: z.number(),
						createdAt: z.coerce.date(),
						images: z.array(
							z.object({
								id: z.string(),
								numOrder: z.number(),
								synapseUploadStartedAt: z.coerce.date(),
								synapseUploadCompletedAt: z.coerce.date(),
								synapsePieceCid: z.string(),
								synapseUploadError: z.string(),
								fluenceOcrStartedAt: z.coerce.date(),
								fluenceOcrCompletedAt: z.coerce.date(),
								fluenceOcrResult: z.any(),
								fluenceOcrError: z.string(),
								createdAt: z.coerce.date(),
							}),
						),
					}),
				),
			},
		},
	};

	async handle(c: AppContext) {
		const data = await this.getValidatedData<typeof this.schema>();
		const { receiptId } = data.params;

		const receipt = await c.get('db').query.receipts.findFirst({
			columns: {
				id: true,
				merchantName: true,
				status: true,
				currency: true,
				totalAmount: true,
				issuedAt: true,
				countryCode: true,
				paymentMethod: true,
				qualityRate: true,
				assignedPoint: true,
				createdAt: true,
			},
			where: eq(receipts.id, receiptId),
			with: {
				images: true,
			},
		});

		if (!receipt) {
			return c.json({ error: 'Receipt not found' }, 404);
		}

		return c.json({
			id: receipt.id,
			merchantName: receipt.merchantName,
			status: receipt.status,
			currency: receipt.currency,
			totalAmount: receipt.totalAmount ?? null,
			issuedAt: receipt.issuedAt,
			countryCode: receipt.countryCode,
			paymentMethod: receipt.paymentMethod ?? null,
			qualityRate: receipt.qualityRate,
			assignedPoint: receipt.assignedPoint,
			createdAt: receipt.createdAt,
			images: receipt.images.map((image) => ({
				id: image.id,
				numOrder: image.numOrder,
				synapseUploadStartedAt: image.synapseUploadStartedAt,
				synapseUploadCompletedAt: image.synapseUploadCompletedAt,
				synapsePieceCid: image.synapsePieceCid,
				synapseUploadError: image.synapseUploadError,
				fluenceOcrStartedAt: image.fluenceOcrStartedAt,
				fluenceOcrCompletedAt: image.fluenceOcrCompletedAt,
				fluenceOcrResult: image.fluenceOcrResult,
				fluenceOcrError: image.fluenceOcrError,
				createdAt: image.createdAt,
			})),
		});
	}
}
