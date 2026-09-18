import type { Platform } from '@halo/contracts';
import type { AuthChallenge } from '@/lib/api/auth';

/** Server-issued challenge: `nonce` plus the HMAC that proves the server minted it. */
export type { AuthChallenge };

/**
 * What one platform has to be able to do for Halo to sign a user in.
 *
 * The three chains differ only in how the wallet handshake happens and which
 * endpoint completes it, so that is all an adapter owns. Session state, error
 * surfacing and navigation live in `stores/auth.ts` and are identical everywhere.
 */
export interface AuthAdapter {
  readonly platform: Platform;

  /**
   * One-time SDK bootstrap (MiniKit install, LIFF + DappPortal init, ...).
   * Safe to call repeatedly — implementations de-duplicate internally.
   * Resolves when `signIn` may be attempted; rejects if the SDK cannot start.
   */
  init(): Promise<void>;

  /**
   * Whether the host wallet environment is actually present. Only meaningful
   * after `init()`. A `false` here means the user opened the app outside its
   * wallet app (a plain mobile browser, say), not that anything failed.
   */
  isAvailable(): boolean;

  /**
   * Run the wallet handshake and exchange the result for a Halo session cookie.
   * Throws `AuthError` on failure; resolves with no value on success, because
   * the session lives in an http-only cookie the client never reads.
   */
  signIn(challenge: AuthChallenge): Promise<void>;
}

export type AuthErrorKind =
  /** User closed or declined the wallet prompt — not worth an error toast. */
  | 'cancelled'
  /** Wallet app / SDK missing or refusing to start. */
  | 'unavailable'
  /** The wallet signed, but the server rejected the result. */
  | 'rejected'
  | 'unknown';

export class AuthError extends Error {
  readonly kind: AuthErrorKind;

  constructor(kind: AuthErrorKind, message: string) {
    super(message);
    this.name = 'AuthError';
    this.kind = kind;
  }
}
