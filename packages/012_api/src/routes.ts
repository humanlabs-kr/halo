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

const v1Routes = fromHono(new Hono());

v1Routes.get('/auth/session/miniapp/nonce', AuthSessionMiniappNonce);
v1Routes.post('/auth/session/miniapp/complete', AuthSessionMiniappComplete);
v1Routes.get('/auth/session/status', jwtAuthMiddleware, AuthSessionStatus as any);
v1Routes.post('/auth/session/revoke', jwtAuthMiddleware, AuthSessionRevoke as any);

v1Routes.post('/test-image', TestReceiptImage);
export default v1Routes;
