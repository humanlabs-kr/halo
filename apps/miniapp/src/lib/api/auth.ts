import { apiFetch, type ApiRequestInit } from './client';

/**
 * Session endpoints — `apps/api/src/routes/client/auth.ts`.
 *
 * Sign-in always runs as nonce → wallet handshake → complete. The completion
 * endpoint differs per chain because the proof does: World and Celo sign SIWE,
 * Kaia signs a plain EIP-191 message, and MiniPay cannot sign at all and is
 * bound to its address by the HMAC'd nonce alone.
 *
 * Nothing here returns a token. The server sets an http-only cookie pair the
 * client never reads, which is why `credentials: 'include'` in `client.ts` is
 * load-bearing rather than incidental.
 */

/** Module-private: every client route is mounted under `/v1`. */
function call<T>(path: string, init?: ApiRequestInit): Promise<T> {
  return apiFetch<T>(`/v1${path}`, init);
}

export interface AuthChallenge {
  nonce: string;
  hmac: string;
}

/** The SIWE / personal_sign result a wallet hands back, as the server expects it. */
export interface SiweAuthPayload {
  status: 'success';
  message: string;
  signature: string;
  address: string;
  version: number;
}

export interface SiweCompleteRequest {
  nonce: string;
  hmac: string;
  payload: SiweAuthPayload;
}

export interface CeloConnectRequest {
  nonce: string;
  hmac: string;
  address: string;
}

export interface CeloVerifyRequest {
  message: string;
  signature: string;
}

/** Every endpoint that mutates the session answers with this and a `Set-Cookie`. */
export interface SessionMutated {
  success: true;
}

export interface SessionStatus {
  address: string;
  username: string;
  verificationLevel: 'none' | 'orb' | 'device';
  profilePictureUrl: string | null;
  /** Whether the wallet has proved ownership by signing. MiniPay starts `false`. */
  verified: boolean;
  isBlacklisted: boolean;
}

export const authApi = {
  nonce(): Promise<AuthChallenge> {
    return call('/auth/session/miniapp/nonce');
  },

  completeWorld(request: SiweCompleteRequest): Promise<SessionMutated> {
    return call('/auth/session/world-miniapp/complete', { method: 'POST', body: request });
  },

  completeCelo(request: SiweCompleteRequest): Promise<SessionMutated> {
    return call('/auth/session/celo-miniapp/complete', { method: 'POST', body: request });
  },

  /** MiniPay has no `personal_sign`, so the session starts unverified. */
  connectCelo(request: CeloConnectRequest): Promise<SessionMutated> {
    return call('/auth/session/celo-miniapp/connect', { method: 'POST', body: request });
  },

  /** Upgrades a connected Celo session to `verified` once the wallet signs. */
  verifyCelo(request: CeloVerifyRequest): Promise<SessionMutated> {
    return call('/auth/session/celo-miniapp/verify', { method: 'POST', body: request });
  },

  completeKaia(request: SiweCompleteRequest): Promise<SessionMutated> {
    return call('/auth/session/kaia-miniapp/complete', { method: 'POST', body: request });
  },

  status(): Promise<SessionStatus> {
    return call('/auth/session/status');
  },

  revoke(): Promise<SessionMutated> {
    return call('/auth/session/revoke', { method: 'POST' });
  },
};
