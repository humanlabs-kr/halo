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
import { TestReceiptImage } from './endpoints/test/ai-analysis';
import { AdminSynapseTestUpload } from './endpoints/test/synapse';
import { AdminSynapseSetup } from './endpoints/admin/synapse/setup';
import { ScanUploadReceipt } from './endpoints/receipt/upload-receipt';
import { ViewSynapseImage } from './endpoints/receipt/view-synapse-image';
import { ViewR2Image } from './endpoints/receipt/view-r2-image';
import { TestResizeImage } from './endpoints/test/resize';
import { TestR2Upload } from './endpoints/test/r2';

const v1Routes = fromHono(new Hono());

v1Routes.get('/auth/session/miniapp/nonce', AuthSessionMiniappNonce);
v1Routes.post('/auth/session/miniapp/complete', AuthSessionMiniappComplete);
v1Routes.get('/auth/session/status', jwtAuthMiddleware, AuthSessionStatus as any);
v1Routes.post('/auth/session/revoke', jwtAuthMiddleware, AuthSessionRevoke as any);

v1Routes.post('/receipt', jwtAuthMiddleware, ScanUploadReceipt as any);
v1Routes.get('/receipt/:receiptId/image/synapse', ViewSynapseImage as any);
v1Routes.get('/receipt/:receiptId/image/r2', ViewR2Image as any);

v1Routes.post('/test-image', TestReceiptImage);
v1Routes.get('/test-resize/:pieceCid', TestResizeImage as any);

v1Routes.post('/admin/r2/test-upload', TestR2Upload);
v1Routes.post('/admin/synapse/test-upload', AdminSynapseTestUpload);
v1Routes.post('/admin/synapse/setup', AdminSynapseSetup);

export default v1Routes;
