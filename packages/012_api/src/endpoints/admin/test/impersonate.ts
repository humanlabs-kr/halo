import { OpenAPIRoute } from 'chanfana';
import { env } from 'cloudflare:workers';
import { AppContext } from 'workers/types';
import { generateAccessToken, generateRefreshToken } from 'workers/utils/jwt';
import z from 'zod';

export class AdminImpersonate extends OpenAPIRoute {
	schema = {
		tags: ['Admin'],
		summary: 'Impersonate a user',
		security: [{ cookie: [] }],
		request: {
			body: {
				required: true,
				content: {
					'application/json': {
						schema: z.object({
							address: z.string(),
						}),
					},
				},
			},
		},
		responses: {
			'200': {
				description: 'Success',
				content: {
					'application/json': {
						schema: z.object({
							result: z.literal('success'),
						}),
					},
				},
			},
		},
	};

	async handle(c: AppContext) {
		const data = await this.getValidatedData<typeof this.schema>();
		const { address } = data.body;

		const accessToken = generateAccessToken({
			sub: address,
		});

		const refreshToken = generateRefreshToken({
			sub: address,
		});

		// set cookies - each cookie needs its own Set-Cookie header
		c.header(
			'Set-Cookie',
			`_access=${accessToken}; Domain=.${env.API_COOKIE_DOMAIN}; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=3153600000`,
			{ append: true },
		);
		c.header(
			'Set-Cookie',
			`_refresh=${refreshToken}; Domain=.${env.API_COOKIE_DOMAIN}; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=3153600000`,
			{ append: true },
		);

		return c.json({
			result: 'success',
		});
	}
}
