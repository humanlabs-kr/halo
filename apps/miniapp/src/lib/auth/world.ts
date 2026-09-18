import { MiniKit } from '@worldcoin/minikit-js';
import { authApi } from '@/lib/api/auth';
import { WORLD_APP_ID } from '@/lib/env';
import { AuthError, type AuthAdapter, type AuthChallenge } from './types';

/** World App signs SIWE through MiniKit; there is no EIP-1193 provider to connect to. */

const SIWE_STATEMENT = 'Sign in to Halo.';
const SIWE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

let installed = false;

export const worldAdapter: AuthAdapter = {
  platform: 'world',

  async init() {
    if (installed) return;
    // Installing without an app id still works for local debugging, it just
    // cannot resolve the mini app's identity inside World App.
    MiniKit.install(WORLD_APP_ID || undefined);
    installed = true;
  },

  isAvailable() {
    return MiniKit.isInstalled();
  },

  async signIn({ nonce, hmac }: AuthChallenge) {
    if (!MiniKit.isInstalled()) {
      throw new AuthError('unavailable', 'Open this mini app inside World App to sign in.');
    }

    const { finalPayload } = await MiniKit.commandsAsync.walletAuth({
      nonce,
      statement: SIWE_STATEMENT,
      expirationTime: new Date(Date.now() + SIWE_EXPIRY_MS),
    });

    if (finalPayload.status === 'error') {
      throw new AuthError('cancelled', 'World App did not return a signature.');
    }

    await authApi
      .completeWorld({ nonce, hmac, payload: finalPayload })
      .catch(() => {
        throw new AuthError('rejected', 'Sign-in could not be completed. Please try again.');
      });
  },
};
