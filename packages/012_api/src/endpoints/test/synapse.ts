import { OpenAPIRoute } from 'chanfana';
import { z } from 'zod';
import type { AppContext } from 'workers/types';
import { ReceiptProcessor } from '../../services/receipt-processor';
import { PhotonImage, resize, SamplingFilter } from '@cf-wasm/photon/workerd';
import { Synapse } from 'workers/services/synapse';

export class AdminSynapseTestUpload extends OpenAPIRoute {
	schema = {
		tags: ['Test'],
		summary: 'Test Synapse Upload',
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
						schema: z.object({
							pieceCid: z.string(),
							size: z.number(),
							pieceId: z.string(),
						}),
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
			const { pieceCid, size, pieceId } = await Synapse.saveReceipt(rawFile);

			return c.json({ pieceCid, size, pieceId });
		} catch (error) {
			console.error('Error saving receipt to Synapse:', error);
			return c.json({ error: error instanceof Error ? error.message : 'Failed to save receipt to Synapse' }, 500);
		}
	}
}
