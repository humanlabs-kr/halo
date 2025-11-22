import { OpenAPIRoute } from 'chanfana';
import { z } from 'zod';
import type { AppContext } from 'workers/types';
import { ReceiptProcessor } from '../../../services/receipt-processor';

// Import schema from receipt-processor (we'll need to export it)
const ReceiptItemSchema = z.object({
	name: z.string(),
	quantity: z.number().optional().nullable(),
	unitPrice: z.number().optional().nullable(),
	totalPrice: z.number(),
});

const ReceiptDataSchema = z.object({
	merchantName: z.string(),
	merchantAddress: z.string().optional().nullable(),
	transactionDate: z.string().optional().nullable(),
	transactionTime: z.string().optional().nullable(),
	totalAmount: z.number(),
	currency: z.string(),
	taxAmount: z.number().optional().nullable(),
	subtotal: z.number().optional().nullable(),
	items: z.array(ReceiptItemSchema),
	paymentMethod: z.string().optional().nullable(),
	receiptNumber: z.string().optional().nullable(),
	notes: z.string().optional().nullable(),
});

export class TestReceiptImageAnalysis extends OpenAPIRoute {
	schema = {
		tags: ['Admin'],
		summary: 'Test receipt image analysis',
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
				content: {
					'application/json': {
						schema: ReceiptDataSchema,
					},
				},
			},
			'400': {
				description: 'Bad Request',
				content: {
					'application/json': {
						schema: z.object({
							error: z.string(),
						}),
					},
				},
			},
			'401': {
				description: 'Unauthorized - Authentication required',
				content: {
					'application/json': {
						schema: z.object({
							code: z.literal('UNAUTHORIZED'),
							error: z.string(),
						}),
					},
				},
			},
			'500': {
				description: 'Internal Server Error',
				content: {
					'application/json': {
						schema: z.object({
							error: z.string(),
						}),
					},
				},
			},
		},
	};

	async handle(c: AppContext) {
		const fd = await c.req.formData();
		const rawFile = fd.get('file');

		if (!rawFile || !(rawFile instanceof File)) {
			return c.json({ error: 'file must be a file' }, 400);
		}

		try {
			const arrayBuffer = await rawFile.arrayBuffer();
			const inputBytes = new Uint8Array(arrayBuffer);

			const receiptData = await ReceiptProcessor.process(inputBytes);

			return receiptData;
		} catch (error) {
			console.error('Error processing receipt:', error);
			return c.json({ error: error instanceof Error ? error.message : 'Failed to process receipt' }, 500);
		}
	}
}
