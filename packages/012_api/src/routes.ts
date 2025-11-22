/**
 * V1 routes
 */

import { fromHono } from 'chanfana';
import { Hono } from 'hono';

import { AuthSessionMiniappComplete } from './endpoints/auth/session/miniapp/complete';
import { AuthSessionMiniappNonce } from './endpoints/auth/session/miniapp/nonce';

import { AuthSessionRevoke } from './endpoints/auth/session/revoke';
import { AuthSessionStatus } from './endpoints/auth/session/status';

import { jwtAuthMiddleware } from './utils/middleware';
import { TestReceiptImage } from './endpoints/test/receipt';
import { AdminSynapseTestUpload } from './endpoints/test/synapse';
import { AdminSynapseSetup } from './endpoints/admin/synapse/setup';
import { Synapse } from './services/synapse';

const v1Routes = fromHono(new Hono());

v1Routes.get('/auth/session/miniapp/nonce', AuthSessionMiniappNonce);
v1Routes.post('/auth/session/miniapp/complete', AuthSessionMiniappComplete);
v1Routes.get('/auth/session/status', jwtAuthMiddleware, AuthSessionStatus as any);
v1Routes.post('/auth/session/revoke', jwtAuthMiddleware, AuthSessionRevoke as any);

v1Routes.post('/test-image', TestReceiptImage);
v1Routes.post('/admin/synapse/test-upload', AdminSynapseTestUpload);
v1Routes.post('/admin/synapse/setup', AdminSynapseSetup);
v1Routes.get('/synapse/file/:pieceCid', async (c) => {
	const pieceCid = c.req.param('pieceCid');
	const image = await Synapse.getImage(pieceCid);

	return c.body(Buffer.from(image), 200, {
		'Content-Type': 'image/jpeg',
	});
});
export default v1Routes;
