import { eq, sql, users } from '@hl/database';
import { computeHMAC, getUserByAddress, tryCatch } from '@hl/server-common';
import { verifySiweMessage } from '@worldcoin/minikit-js';
import { contentJson, OpenAPIRoute } from 'chanfana';
import { env } from 'cloudflare:workers';
import dedent from 'dedent';
import { getAddress } from 'viem';
import type { AppContext } from 'workers/types';
import { generateAccessToken, generateRefreshToken } from 'workers/utils/jwt';
import { z } from 'zod';

export class AuthSessionMiniappComplete extends OpenAPIRoute {
	schema = {
		tags: ['Auth'],
		summary: 'Complete miniapp login request',
		security: [{ cookie: [] }],
		request: {
			body: contentJson(
				z.object({
					nonce: z.string(),
					hmac: z.string(),
					payload: z.object({
						status: z.literal('success'),
						message: z.string(),
						signature: z.string(),
						address: z.string().startsWith('0x'),
						version: z.number(),
					}),
				})
			),
		},
		responses: {
			'200': {
				description: 'Successfully created auth session',
				...contentJson({
					success: z.literal(true),
				}),
			},
			'400': {
				description: dedent`
					- INVALID_REQUEST: Invalid request
					- USER_NOT_FOUND: User not found
					- INVALID_SIWE_MESSAGE: Invalid SIWE message
				`,
				...contentJson({
					code: z.literal('INVALID_REQUEST').or(z.literal('USER_NOT_FOUND')).or(z.literal('INVALID_SIWE_MESSAGE')),
					message: z.string(),
				}),
			},
		},
	};

	async handle(c: AppContext) {
		const data = await this.getValidatedData<typeof this.schema>();
		const { nonce, hmac, payload } = data.body;

		const computedHmac = await computeHMAC(nonce, env.JWT_SECRET);

		if (computedHmac !== hmac) {
			return c.json(
				{
					code: 'INVALID_REQUEST',
					message: 'HMAC validation failed',
				},
				400
			);
		}

		const { isValid } = await verifySiweMessage(payload, nonce);

		if (!isValid) {
			return c.json(
				{
					code: 'INVALID_SIWE_MESSAGE',
					message: 'Invalid SIWE message',
				},
				400
			);
		}

		const worldUserByAddress = await getUserByAddress(payload.address);

		if (!worldUserByAddress) {
			return c.json(
				{
					code: 'USER_NOT_FOUND',
					message: 'User not found',
				},
				400
			);
		}

		const trxResult = await tryCatch(
			c.get('db').transaction(async (tx) => {
				const address = getAddress(worldUserByAddress.address);
				const prevUser = await tx.query.users.findFirst({
					where: eq(users.address, address.toLowerCase() as `0x${string}`),
				});

				const user = await tx
					.insert(users)
					.values({
						address: address.toLowerCase() as `0x${string}`,
						username: worldUserByAddress.username ?? '',
						profilePictureUrl: worldUserByAddress.profile_picture_url ?? undefined,
						checksumAddress: address,
					})
					.onConflictDoUpdate({
						target: users.address,
						set: {
							username: sql`excluded.username`,
							profilePictureUrl: sql`excluded.profile_picture_url`,
						},
					})
					.returning({
						address: users.address,
					})
					.then((res) => res.at(0)!);

				return {
					user,
					isNewUser: !prevUser,
				};
			})
		);

		if (trxResult.error) {
			return c.json(
				{
					code: trxResult.error.message,
					message: trxResult.error.cause,
				},
				400
			);
		}

		const accessToken = generateAccessToken({
			sub: trxResult.data.user.address,
		});

		const refreshToken = generateRefreshToken({
			sub: trxResult.data.user.address,
		});

		// set cookies - each cookie needs its own Set-Cookie header
		c.header(
			'Set-Cookie',
			`_access=${accessToken}; Domain=.${env.API_COOKIE_DOMAIN}; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=3153600000`,
			{ append: true }
		);
		c.header(
			'Set-Cookie',
			`_refresh=${refreshToken}; Domain=.${env.API_COOKIE_DOMAIN}; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=3153600000`,
			{ append: true }
		);

		return c.json({
			success: true,
		});
	}
}
