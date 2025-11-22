import { eq, users } from '@hl/database';
import { contentJson, OpenAPIRoute } from 'chanfana';
import type { AppContext } from 'workers/types';
import { z } from 'zod';

export class AuthSessionStatus extends OpenAPIRoute {
	schema = {
		tags: ['Auth'],
		summary: 'Get session status.',
		security: [{ cookieAuth: [] }],
		responses: {
			'200': {
				description: 'Successfully get session status',
				...contentJson({
					address: z.string().startsWith('0x'),
					username: z.string().optional(),
					verificationLevel: z.enum(['none', 'orb', 'device']),
					profilePictureUrl: z.string().optional(),
				}),
			},
			'400': {
				description: 'Failed to get session status',
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
		const address = c.get('address');

		const user = await c.get('db').query.users.findFirst({
			where: eq(users.address, address),
		});

		if (!user) {
			return c.json(
				{
					code: 'INVALID_REQUEST',
					message: 'User not found',
				},
				400
			);
		}

		return c.json({
			address: user.address,
			username: user.username,
			profilePictureUrl: user.profilePictureUrl,
			verificationLevel: user.verificationLevel,
		});
	}
}
