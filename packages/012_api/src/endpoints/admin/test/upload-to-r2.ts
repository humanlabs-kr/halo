import { OpenAPIRoute } from 'chanfana';
import { z } from 'zod';
import type { AppContext } from 'workers/types';
import { R2 } from 'workers/utils/r2';

export class TestR2Upload extends OpenAPIRoute {
	schema = {
		tags: ['Admin'],
		summary: 'Test R2 Upload',
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
							url: z.string(),
							key: z.string(),
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

		const arrayBuffer = await rawFile.arrayBuffer();
		const inputBytes = new Uint8Array(arrayBuffer);

		try {
			const { key } = await R2.saveReceiptImage(inputBytes);

			return c.json({ key, url: `https://r2.receipto.humanlabs.world/${key}` });
		} catch (error) {
			console.error('Error saving receipt to R2:', error);
			return c.json({ error: error instanceof Error ? error.message : 'Failed to save receipt to R2' }, 500);
		}
	}
}
