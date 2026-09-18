import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { dataSchema, errorSchema } from '@halo/contracts';
import { blacklistedAddresses, eq, sql, users } from '@halo/database';
import type { Context } from 'hono';
import { deleteCookie, setCookie } from 'hono/cookie';
import { SiweMessage } from 'siwe';
import { getAddress, isAddress, verifyMessage } from 'viem';
import { concealedAddress } from '../../lib/address';
import { computeHmac, timingSafeEqual } from '../../lib/hmac';
import {
  ACCESS_COOKIE_MAX_AGE,
  REFRESH_COOKIE_MAX_AGE,
  signAccessToken,
  signRefreshToken,
} from '../../lib/jwt';
import { userAuth } from '../../middleware/auth';
import type { AppEnv } from '../../types';

const ACCESS_COOKIE = '_access';
const REFRESH_COOKIE = '_refresh';

const app = new OpenAPIHono<AppEnv>({
  defaultHook: (result, c) => {
    if (!result.success) {
      return c.json(
        {
          error: {
            code: 'BAD_REQUEST' as const,
            message: result.error.issues[0]?.message ?? 'Invalid request',
          },
        },
        400,
      );
    }
  },
});

/**
 * The miniapp webview and the API sit on different domains, so the session cookies have to be
 * `SameSite=None; Secure`. They are always issued as a pair — an access cookie without its
 * refresh partner leaves the client unable to recover once the access token expires.
 */
function setSessionCookies(c: Context<AppEnv>, accessToken: string, refreshToken: string): void {
  const domain = `.${c.env.API_COOKIE_DOMAIN}`;

  setCookie(c, ACCESS_COOKIE, accessToken, {
    domain,
    path: '/',
    httpOnly: true,
    secure: true,
    sameSite: 'None',
    maxAge: ACCESS_COOKIE_MAX_AGE,
  });
  setCookie(c, REFRESH_COOKIE, refreshToken, {
    domain,
    path: '/',
    httpOnly: true,
    secure: true,
    sameSite: 'None',
    maxAge: REFRESH_COOKIE_MAX_AGE,
  });
}

/**
 * World username lookup.
 *
 * `@worldcoin/minikit-js` is not a dependency here, so we hit the public usernames API
 * directly — it is an unauthenticated GET and the SDK wrapper added nothing else.
 * A miss (404) means the address has never been provisioned in World App.
 */
async function fetchWorldUser(
  address: string,
): Promise<{ address: string; username: string | null; profile_picture_url: string | null } | null> {
  const response = await fetch(`https://usernames.worldcoin.org/api/v1/${address}`);

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as {
    address: string;
    username: string | null;
    profile_picture_url: string | null;
  };
}

const siweCompleteBody = z.object({
  nonce: z.string(),
  hmac: z.string(),
  payload: z.object({
    status: z.literal('success'),
    message: z.string(),
    signature: z.string(),
    address: z.string().startsWith('0x'),
    version: z.number(),
  }),
});

const sessionCreatedSchema = dataSchema(z.object({ success: z.literal(true) }));

// ── GET /auth/session/miniapp/nonce ─────────────────────────────────────────

const nonceRoute = createRoute({
  method: 'get',
  path: '/auth/session/miniapp/nonce',
  tags: ['Auth'],
  summary: 'Get nonce for miniapp login request.',
  responses: {
    200: {
      description: 'Successfully got a nonce',
      content: {
        'application/json': {
          schema: dataSchema(z.object({ nonce: z.string(), hmac: z.string() })),
        },
      },
    },
  },
});

app.openapi(nonceRoute, async (c) => {
  const nonce = crypto.randomUUID().replace(/-/g, '');
  // Signed with the dedicated session secret rather than the JWT signing key: a leaked nonce
  // HMAC must not give anyone material to reason about the token signing key.
  const hmac = await computeHmac(nonce, c.env.SESSION_HMAC_SECRET);

  return c.json({ data: { nonce, hmac } }, 200);
});

// ── POST /auth/session/world-miniapp/complete ───────────────────────────────

const worldCompleteRoute = createRoute({
  method: 'post',
  path: '/auth/session/world-miniapp/complete',
  tags: ['Auth'],
  summary: 'Complete world miniapp login request',
  request: {
    body: { required: true, content: { 'application/json': { schema: siweCompleteBody } } },
  },
  responses: {
    200: {
      description: 'Successfully created auth session',
      content: { 'application/json': { schema: sessionCreatedSchema } },
    },
    400: {
      description:
        'INVALID_REQUEST (HMAC mismatch) / INVALID_SIWE_MESSAGE / USER_NOT_FOUND (no World App account)',
      content: { 'application/json': { schema: errorSchema } },
    },
  },
});

app.openapi(worldCompleteRoute, async (c) => {
  const { nonce, hmac, payload } = c.req.valid('json');

  const computedHmac = await computeHmac(nonce, c.env.SESSION_HMAC_SECRET);

  if (!timingSafeEqual(computedHmac, hmac)) {
    return c.json(
      { error: { code: 'INVALID_REQUEST' as const, message: 'HMAC validation failed' } },
      400,
    );
  }

  // The nonce is bound into the signed SIWE message, so verifying it here is what stops a
  // captured signature from being replayed against a freshly minted nonce.
  const siweMessage = new SiweMessage(payload.message);
  let siweVerified = false;

  try {
    const { success } = await siweMessage.verify({ signature: payload.signature, nonce });
    siweVerified = success;
  } catch {
    siweVerified = false;
  }

  if (!siweVerified) {
    return c.json(
      { error: { code: 'INVALID_SIWE_MESSAGE' as const, message: 'Invalid SIWE message' } },
      400,
    );
  }

  const worldUserByAddress = await fetchWorldUser(payload.address);

  if (!worldUserByAddress) {
    return c.json({ error: { code: 'USER_NOT_FOUND' as const, message: 'User not found' } }, 400);
  }

  let userAddress: `0x${string}`;

  try {
    userAddress = await c.get('db').transaction(async (tx) => {
      const address = getAddress(worldUserByAddress.address);

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
        .returning({ address: users.address })
        .then((res) => res.at(0)!);

      return user.address;
    });
  } catch (error) {
    console.error('[auth/world-miniapp/complete] upsert failed:', error);
    return c.json(
      { error: { code: 'INVALID_REQUEST' as const, message: 'Failed to create session' } },
      400,
    );
  }

  const [accessToken, refreshToken] = await Promise.all([
    signAccessToken(c.env.JWT_SECRET, { sub: userAddress }),
    signRefreshToken(c.env.JWT_SECRET, { sub: userAddress }),
  ]);

  setSessionCookies(c, accessToken, refreshToken);

  return c.json({ data: { success: true as const } }, 200);
});

// ── POST /auth/session/celo-miniapp/complete ────────────────────────────────

const celoCompleteRoute = createRoute({
  method: 'post',
  path: '/auth/session/celo-miniapp/complete',
  tags: ['Auth'],
  summary: 'Complete celo miniapp login request',
  request: {
    body: { required: true, content: { 'application/json': { schema: siweCompleteBody } } },
  },
  responses: {
    200: {
      description: 'Successfully created auth session',
      content: { 'application/json': { schema: sessionCreatedSchema } },
    },
    400: {
      description: 'INVALID_REQUEST (HMAC mismatch) / INVALID_SIWE_MESSAGE',
      content: { 'application/json': { schema: errorSchema } },
    },
  },
});

app.openapi(celoCompleteRoute, async (c) => {
  const { nonce, hmac, payload } = c.req.valid('json');

  const computedHmac = await computeHmac(nonce, c.env.SESSION_HMAC_SECRET);

  if (!timingSafeEqual(computedHmac, hmac)) {
    return c.json(
      { error: { code: 'INVALID_REQUEST' as const, message: 'HMAC validation failed' } },
      400,
    );
  }

  const siweMessage = new SiweMessage(payload.message);

  try {
    await siweMessage.verify({ signature: payload.signature });
  } catch {
    return c.json(
      { error: { code: 'INVALID_SIWE_MESSAGE' as const, message: 'Invalid SIWE message' } },
      400,
    );
  }

  let userAddress: `0x${string}`;

  try {
    userAddress = await c.get('db').transaction(async (tx) => {
      const address = getAddress(payload.address);

      const user = await tx
        .insert(users)
        .values({
          platform: 'celo',
          address: address.toLowerCase() as `0x${string}`,
          username: concealedAddress(address),
          checksumAddress: address,
        })
        .onConflictDoUpdate({
          target: users.address,
          set: { username: concealedAddress(address) },
        })
        .returning({ address: users.address })
        .then((res) => res.at(0)!);

      return user.address;
    });
  } catch (error) {
    console.error('[auth/celo-miniapp/complete] upsert failed:', error);
    return c.json(
      { error: { code: 'INVALID_REQUEST' as const, message: 'Failed to create session' } },
      400,
    );
  }

  const [accessToken, refreshToken] = await Promise.all([
    signAccessToken(c.env.JWT_SECRET, { sub: userAddress }),
    signRefreshToken(c.env.JWT_SECRET, { sub: userAddress }),
  ]);

  setSessionCookies(c, accessToken, refreshToken);

  return c.json({ data: { success: true as const } }, 200);
});

// ── POST /auth/session/celo-miniapp/connect ─────────────────────────────────

const celoConnectRoute = createRoute({
  method: 'post',
  path: '/auth/session/celo-miniapp/connect',
  tags: ['Auth'],
  summary: 'Connect celo miniapp (MiniPay) - no signature required',
  request: {
    body: {
      required: true,
      content: {
        'application/json': {
          schema: z.object({
            nonce: z.string(),
            hmac: z.string(),
            address: z.string().startsWith('0x'),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Successfully created auth session',
      content: { 'application/json': { schema: sessionCreatedSchema } },
    },
    400: {
      description: 'INVALID_REQUEST (HMAC mismatch) / INVALID_ADDRESS',
      content: { 'application/json': { schema: errorSchema } },
    },
  },
});

app.openapi(celoConnectRoute, async (c) => {
  const { nonce, hmac, address } = c.req.valid('json');

  const computedHmac = await computeHmac(nonce, c.env.SESSION_HMAC_SECRET);

  if (!timingSafeEqual(computedHmac, hmac)) {
    return c.json(
      { error: { code: 'INVALID_REQUEST' as const, message: 'HMAC validation failed' } },
      400,
    );
  }

  if (!isAddress(address)) {
    return c.json(
      { error: { code: 'INVALID_ADDRESS' as const, message: 'Invalid address format' } },
      400,
    );
  }

  const checksumAddress = getAddress(address);

  let userAddress: `0x${string}`;

  try {
    userAddress = await c.get('db').transaction(async (tx) => {
      const user = await tx
        .insert(users)
        .values({
          platform: 'celo',
          address: checksumAddress.toLowerCase() as `0x${string}`,
          username: concealedAddress(checksumAddress),
          checksumAddress,
        })
        .onConflictDoUpdate({
          target: users.address,
          set: { username: concealedAddress(checksumAddress) },
        })
        .returning({ address: users.address })
        .then((res) => res.at(0)!);

      return user.address;
    });
  } catch (error) {
    console.error('[auth/celo-miniapp/connect] upsert failed:', error);
    return c.json(
      { error: { code: 'INVALID_REQUEST' as const, message: 'Failed to create session' } },
      400,
    );
  }

  // MiniPay hands us an address without a signature, so the session starts unverified.
  // `/auth/session/celo-miniapp/verify` is what upgrades it once the wallet signs.
  const [accessToken, refreshToken] = await Promise.all([
    signAccessToken(c.env.JWT_SECRET, { sub: userAddress, verified: false }),
    signRefreshToken(c.env.JWT_SECRET, { sub: userAddress, verified: false }),
  ]);

  setSessionCookies(c, accessToken, refreshToken);

  return c.json({ data: { success: true as const } }, 200);
});

// ── POST /auth/session/celo-miniapp/verify ──────────────────────────────────

const celoVerifyRoute = createRoute({
  method: 'post',
  path: '/auth/session/celo-miniapp/verify',
  tags: ['Auth'],
  summary: 'Verify wallet ownership via SIWE for celo miniapp',
  middleware: [userAuth] as const,
  request: {
    body: {
      required: true,
      content: {
        'application/json': {
          schema: z.object({ message: z.string(), signature: z.string() }),
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Successfully verified wallet ownership',
      content: { 'application/json': { schema: sessionCreatedSchema } },
    },
    400: {
      description: "INVALID_SIWE_MESSAGE / ADDRESS_MISMATCH (signed address isn't the session's)",
      content: { 'application/json': { schema: errorSchema } },
    },
    401: { description: 'Unauthorized', content: { 'application/json': { schema: errorSchema } } },
  },
});

app.openapi(celoVerifyRoute, async (c) => {
  const { message, signature } = c.req.valid('json');
  const sessionAddress = c.get('address')!;

  const siweMessage = new SiweMessage(message);

  try {
    await siweMessage.verify({ signature });
  } catch {
    return c.json(
      { error: { code: 'INVALID_SIWE_MESSAGE' as const, message: 'Invalid SIWE signature' } },
      400,
    );
  }

  if (siweMessage.address.toLowerCase() !== sessionAddress.toLowerCase()) {
    return c.json(
      {
        error: {
          code: 'ADDRESS_MISMATCH' as const,
          message: 'Signed address does not match session address',
        },
      },
      400,
    );
  }

  // Reissue both tokens with `verified: true` — the claim lives in the token, so an in-place
  // flag flip elsewhere would not reach a client already holding the old one.
  const [accessToken, refreshToken] = await Promise.all([
    signAccessToken(c.env.JWT_SECRET, { sub: sessionAddress, verified: true }),
    signRefreshToken(c.env.JWT_SECRET, { sub: sessionAddress, verified: true }),
  ]);

  setSessionCookies(c, accessToken, refreshToken);

  return c.json({ data: { success: true as const } }, 200);
});

// ── POST /auth/session/kaia-miniapp/complete ────────────────────────────────

const kaiaCompleteRoute = createRoute({
  method: 'post',
  path: '/auth/session/kaia-miniapp/complete',
  tags: ['Auth'],
  summary: 'Complete Kaia miniapp login request',
  request: {
    body: { required: true, content: { 'application/json': { schema: siweCompleteBody } } },
  },
  responses: {
    200: {
      description: 'Successfully created auth session',
      content: { 'application/json': { schema: sessionCreatedSchema } },
    },
    400: {
      description: 'INVALID_REQUEST (HMAC mismatch) / INVALID_SIGNATURE',
      content: { 'application/json': { schema: errorSchema } },
    },
  },
});

app.openapi(kaiaCompleteRoute, async (c) => {
  const { nonce, hmac, payload } = c.req.valid('json');

  const computedHmac = await computeHmac(nonce, c.env.SESSION_HMAC_SECRET);

  if (!timingSafeEqual(computedHmac, hmac)) {
    return c.json(
      { error: { code: 'INVALID_REQUEST' as const, message: 'HMAC validation failed' } },
      400,
    );
  }

  // `kaia_connectAndSign` produces an EIP-191 personal_sign signature, not a SIWE envelope —
  // running it through the SIWE parser would reject every valid Kaia login.
  const address = getAddress(payload.address);
  const isValidSignature = await verifyMessage({
    address,
    message: payload.message,
    signature: payload.signature as `0x${string}`,
  });

  if (!isValidSignature) {
    return c.json(
      { error: { code: 'INVALID_SIGNATURE' as const, message: 'Invalid signature' } },
      400,
    );
  }

  let userAddress: `0x${string}`;

  try {
    userAddress = await c.get('db').transaction(async (tx) => {
      const user = await tx
        .insert(users)
        .values({
          platform: 'kaia',
          address: address.toLowerCase() as `0x${string}`,
          username: concealedAddress(address),
          checksumAddress: address,
        })
        .onConflictDoUpdate({
          target: users.address,
          set: { username: concealedAddress(address) },
        })
        .returning({ address: users.address })
        .then((res) => res.at(0)!);

      return user.address;
    });
  } catch (error) {
    console.error('[auth/kaia-miniapp/complete] upsert failed:', error);
    return c.json(
      { error: { code: 'INVALID_REQUEST' as const, message: 'Failed to create session' } },
      400,
    );
  }

  const [accessToken, refreshToken] = await Promise.all([
    signAccessToken(c.env.JWT_SECRET, { sub: userAddress }),
    signRefreshToken(c.env.JWT_SECRET, { sub: userAddress }),
  ]);

  setSessionCookies(c, accessToken, refreshToken);

  return c.json({ data: { success: true as const } }, 200);
});

// ── GET /auth/session/status ────────────────────────────────────────────────

const statusRoute = createRoute({
  method: 'get',
  path: '/auth/session/status',
  tags: ['Auth'],
  summary: 'Get session status.',
  middleware: [userAuth] as const,
  responses: {
    200: {
      description: 'Successfully got session status',
      content: {
        'application/json': {
          schema: dataSchema(
            z.object({
              address: z.string().startsWith('0x'),
              username: z.string(),
              verificationLevel: z.enum(['none', 'orb', 'device']),
              profilePictureUrl: z.string().nullable(),
              verified: z.boolean(),
              isBlacklisted: z.boolean(),
            }),
          ),
        },
      },
    },
    401: { description: 'Unauthorized', content: { 'application/json': { schema: errorSchema } } },
    404: {
      description: 'USER_NOT_FOUND',
      content: { 'application/json': { schema: errorSchema } },
    },
  },
});

app.openapi(statusRoute, async (c) => {
  const address = c.get('address')!;
  const db = c.get('db');

  const user = await db.query.users.findFirst({ where: eq(users.address, address) });

  if (!user) {
    return c.json({ error: { code: 'USER_NOT_FOUND' as const, message: 'User not found' } }, 404);
  }

  const blacklisted = await db.query.blacklistedAddresses.findFirst({
    where: eq(blacklistedAddresses.address, address),
  });

  return c.json(
    {
      data: {
        address: user.address,
        username: user.username,
        profilePictureUrl: user.profilePictureUrl,
        verificationLevel: user.verificationLevel,
        verified: c.get('verified') ?? false,
        isBlacklisted: !!blacklisted,
      },
    },
    200,
  );
});

// ── POST /auth/session/revoke ───────────────────────────────────────────────

const revokeRoute = createRoute({
  method: 'post',
  path: '/auth/session/revoke',
  tags: ['Auth'],
  summary: 'Revoke session.',
  middleware: [userAuth] as const,
  responses: {
    200: {
      description: 'Successfully revoked session',
      content: { 'application/json': { schema: sessionCreatedSchema } },
    },
    401: { description: 'Unauthorized', content: { 'application/json': { schema: errorSchema } } },
  },
});

app.openapi(revokeRoute, async (c) => {
  const domain = `.${c.env.API_COOKIE_DOMAIN}`;

  // Both cookies go: dropping only the access cookie would leave a live refresh token behind,
  // which is exactly what "revoke" is supposed to prevent.
  deleteCookie(c, ACCESS_COOKIE, { domain, path: '/', secure: true, sameSite: 'None' });
  deleteCookie(c, REFRESH_COOKIE, { domain, path: '/', secure: true, sameSite: 'None' });

  return c.json({ data: { success: true as const } }, 200);
});

export const clientAuthRoutes = app;
