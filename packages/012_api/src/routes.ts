/**
 * V1 routes
 */

import { fromHono } from 'chanfana';
import { Hono } from 'hono';

import { AuthSessionMiniappComplete } from './endpoints/auth/session/miniapp/complete';
import { AuthSessionMiniappNonce } from './endpoints/auth/session/miniapp/nonce';

import { AuthSessionRevoke } from './endpoints/auth/session/revoke';
import { AuthSessionStatus } from './endpoints/auth/session/status';

import { adminAuthMiddleware, jwtAuthMiddleware } from './utils/middleware';
import { TestReceiptImageAnalysis } from './endpoints/admin/test/ai-analysis';
import { AdminSynapseTestUpload } from './endpoints/admin/test/upload-to-synapse';
import { AdminSynapseSetup } from './endpoints/admin/synapse/setup';
import { ScanUploadReceipt } from './endpoints/receipt/upload-receipt';
import { ViewSynapseImage } from './endpoints/receipt/view-synapse-image';
import { ViewR2Image } from './endpoints/receipt/view-r2-image';
import { TestR2Upload } from './endpoints/admin/test/upload-to-r2';
import { AdminImpersonate } from './endpoints/admin/test/impersonate';
import { ListReceipts } from './endpoints/receipt/list';

const v1Routes = fromHono(new Hono());

v1Routes.get('/auth/session/miniapp/nonce', AuthSessionMiniappNonce);
v1Routes.post('/auth/session/miniapp/complete', AuthSessionMiniappComplete);
v1Routes.get('/auth/session/status', jwtAuthMiddleware, AuthSessionStatus as any);
v1Routes.post('/auth/session/revoke', jwtAuthMiddleware, AuthSessionRevoke as any);

v1Routes.post('/receipts', jwtAuthMiddleware, ScanUploadReceipt as any);
v1Routes.get('/receipts', jwtAuthMiddleware, ListReceipts as any);
v1Routes.get('/receipts/:receiptId/image/synapse', ViewSynapseImage as any);
v1Routes.get('/receipts/:receiptId/image/r2', ViewR2Image as any);

v1Routes.post('/admin/test/image-analysis', adminAuthMiddleware, TestReceiptImageAnalysis as any);
v1Routes.post('/admin/test/r2-upload', adminAuthMiddleware, TestR2Upload as any);
v1Routes.post('/admin/test/synapse-upload', adminAuthMiddleware, AdminSynapseTestUpload as any);
v1Routes.post('/admin/synapse/setup', adminAuthMiddleware, AdminSynapseSetup as any);
v1Routes.post('/admin/test/impersonate', adminAuthMiddleware, AdminImpersonate as any);

export default v1Routes;
