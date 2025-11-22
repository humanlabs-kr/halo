import { Context } from 'hono';
import { Synapse } from 'workers/services/synapse';
import { R2 } from 'workers/utils/r2';

export const ViewR2Image = async (c: Context) => {
	const key = c.req.param('key');
	const image = await R2.downloadReceiptImage(key);

	return c.body(Buffer.from(image), 200, {
		'Cache-Control': 'public, max-age=31536000, immutable',
		'Content-Type': 'image/jpeg',
	});
};
