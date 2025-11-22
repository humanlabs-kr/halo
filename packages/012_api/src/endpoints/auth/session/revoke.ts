import { contentJson, OpenAPIRoute } from 'chanfana';
import { env } from 'cloudflare:workers';
import type { AppContext } from 'workers/types';
import { z } from 'zod';

export class AuthSessionRevoke extends OpenAPIRoute {
	schema = {
		tags: ['Auth'],
		summary: 'Revoke session.',
		security: [{ cookie: [] }],
		responses: {
			'200': {
				description: 'Successfully revoked session',
				...contentJson({
					success: z.literal(true),
				}),
			},
			'400': {
				description: 'Failed to revoke session',
				...contentJson({
					code: z.literal('INVALID_REQUEST'),
					message: z.string(),
				}),
			},
			'401': {
				description: 'Unauthorized',
				...contentJson({
					code: z.literal('UNAUTHORIZED'),
					message: z.string(),
				}),
			},
		},
	};

	async handle(c: AppContext) {
		c.header('Set-Cookie', `_access=; Domain=.${env.API_COOKIE_DOMAIN}; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=0`);

		return c.json({
			success: true,
		});
	}
}
