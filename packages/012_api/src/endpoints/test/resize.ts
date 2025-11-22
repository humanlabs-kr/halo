import { Context } from 'hono';
import { Synapse } from 'workers/services/synapse';
import { ReceiptProcessor } from 'workers/services/receipt-processor';

export const TestResizeImage = async (c: Context) => {
	const pieceCid = c.req.param('pieceCid');
	const rawFile = await Synapse.getImage(pieceCid);

	const jpegBytes = ReceiptProcessor.normalizeImage(rawFile);

	return c.body(Buffer.from(jpegBytes), 200, {
		'Content-Type': 'image/jpeg',
	});
};
