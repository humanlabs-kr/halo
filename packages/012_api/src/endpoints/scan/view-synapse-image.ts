import { Context } from 'hono';
import { Synapse } from 'workers/services/synapse';

export const ViewSynapseImage = async (c: Context) => {
	const pieceCid = c.req.param('pieceCid');
	const image = await Synapse.getImage(pieceCid);

	return c.body(Buffer.from(image), 200, {
		'Cache-Control': 'public, max-age=31536000, immutable',
		'Content-Type': 'image/jpeg',
	});
};
