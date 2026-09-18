import { sign, verify } from 'hono/jwt';

/**
 * Session tokens. Every token is minted and checked here; routes only call
 * these functions.
 *
 * ── Compatibility constraint ────────────────────────────────────────────────
 * Tokens already held by live users have to keep working, so the claim set is
 * fixed by what is already in the wild:
 *
 *   { sub: <wallet address>, verified?: boolean, iat, exp }   HS256
 *
 * `iss` and `aud` are deliberately absent. Splitting the audiences would be
 * better practice — it is what stops a refresh token being presented as an
 * access token — but no existing token carries those claims, so enforcing them
 * would sign out the entire installed base the moment this deploys.
 *
 * Introducing them is a staged change, not a one-liner: accept both shapes for
 * one full expiry window, then start requiring the claims. The same applies to
 * the one-year lifetime below, which is long for an access token and only
 * shrinks safely once refresh is doing the work.
 */
const ALG = 'HS256';

// Matches the lifetime of tokens already issued. See the note above before
// changing either of these.
const ACCESS_TTL_SECONDS = 60 * 60 * 24 * 365;
const REFRESH_TTL_SECONDS = 60 * 60 * 24 * 365;

export interface AccessPayload {
  /** Wallet address, lowercased. */
  sub: string;
  /** Whether wallet ownership was proven with SIWE. */
  verified?: boolean;
}

function now(): number {
  return Math.floor(Date.now() / 1000);
}

export async function signAccessToken(secret: string, payload: AccessPayload): Promise<string> {
  const iat = now();
  return sign({ ...payload, iat, exp: iat + ACCESS_TTL_SECONDS }, secret, ALG);
}

export async function signRefreshToken(secret: string, payload: AccessPayload): Promise<string> {
  const iat = now();
  return sign({ ...payload, iat, exp: iat + REFRESH_TTL_SECONDS }, secret, ALG);
}

/**
 * Verifies the signature and `exp`, then checks a subject is present.
 *
 * Access and refresh tokens are structurally identical today, so this accepts
 * either. That was already true of the tokens this replaces; narrowing it now
 * would break refresh flows that are mid-flight.
 */
export async function verifyAccessToken(secret: string, token: string): Promise<AccessPayload> {
  const payload = await verify(token, secret, ALG);
  if (typeof payload.sub !== 'string' || payload.sub.length === 0) {
    throw new Error('Invalid token subject');
  }
  return payload as unknown as AccessPayload;
}

export const verifyRefreshToken = verifyAccessToken;

export const ACCESS_COOKIE_MAX_AGE = ACCESS_TTL_SECONDS;
export const REFRESH_COOKIE_MAX_AGE = REFRESH_TTL_SECONDS;
