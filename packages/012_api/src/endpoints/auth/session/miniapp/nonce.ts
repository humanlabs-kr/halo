import { computeHMAC } from '@hl/server-common';
import { OpenAPIRoute } from 'chanfana';
import { env } from 'cloudflare:workers';
import type { AppContext } from 'workers/types';
import { z } from 'zod';

export class AuthSessionMiniappNonce extends OpenAPIRoute {
	schema = {
		tags: ['Auth'],
		summary: 'Get nonce for miniapp login request.',
		security: [{ cookie: [] }],
		responses: {
			'200': {
				description: 'Successfully get nonce',
				content: {
					'application/json': {
						schema: z.object({
							nonce: z.string(),
							hmac: z.string(),
						}),
					},
				},
			},
			'400': {
				description: 'Failed to get nonce',
				content: {
					'application/json': {
						schema: z.object({
							code: z.literal('INVALID_REQUEST'),
							error: z.string(),
						}),
					},
				},
			},
		},
	};

	async handle(c: AppContext) {
		const nonce = crypto.randomUUID().replace(/-/g, '');
		const hmac = await computeHMAC(nonce, env.JWT_SECRET);

		return c.json({
			nonce,
			hmac,
		});
	}
}
