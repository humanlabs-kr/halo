import { OpenAPIRoute, contentJson } from 'chanfana';
import { z } from 'zod';
import type { AppContext } from 'workers/types';
import { desc, eq, receipts } from '@hl/database';
import { R2 } from 'workers/utils/r2';

export class GetReceiptImage extends OpenAPIRoute {
	schema = {
		tags: ['Receipt'],
		summary: 'Get receipt image',
		security: [{ cookie: [] }],
		request: {
			params: z.object({
				receiptId: z.string(),
				receiptImageId: z.string(),
			}),
		},
		responses: {
			'200': {
				description: 'Success',
				content: {
					'image/jpeg': {
						schema: z.instanceof(Buffer),
					},
				},
			},
		},
	};

	async handle(c: AppContext) {
		const data = await this.getValidatedData<typeof this.schema>();
		const { receiptImageId } = data.params;

		const image = await R2.downloadReceiptImage(receiptImageId);

		return c.body(Buffer.from(image), 200, {
			'Cache-Control': 'public, max-age=31536000, immutable',
			'Content-Type': 'image/jpeg',
		});
	}
}
