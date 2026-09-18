import type DappPortalSDK from '@linenext/dapp-portal-sdk';
import { PLATFORM_CHAIN_ID } from '@halo/contracts';
import { authApi } from '@/lib/api/auth';
import { KAIA_CLIENT_ID, KAIA_LIFF_ID } from '@/lib/env';
import { AuthError, type AuthAdapter, type AuthChallenge } from './types';

/**
 * Kaia runs inside LINE: LIFF provides the app context and the DappPortal SDK
 * provides the wallet. Both SDKs are large and only ever used on this one
 * platform, so they are pulled in with dynamic `import()` — a World or MiniPay
 * user never downloads them.
 */

const SIGN_IN_MESSAGE =
  'Sign in to Halo on Kaia. This signature is for authentication only and does not initiate any blockchain transaction.';

let sdk: DappPortalSDK | null = null;
let initPromise: Promise<void> | null = null;

async function bootstrap(): Promise<void> {
  if (!KAIA_CLIENT_ID) {
    throw new AuthError('unavailable', 'Kaia wallet is not configured for this deployment.');
  }

  if (KAIA_LIFF_ID) {
    const { default: liff } = await import('@line/liff');
    await liff.init({ liffId: KAIA_LIFF_ID });
  }

  const { default: dappPortalSdk } = await import('@linenext/dapp-portal-sdk');
  sdk = await dappPortalSdk.init({
    clientId: KAIA_CLIENT_ID,
    chainId: String(PLATFORM_CHAIN_ID.kaia),
  });
}

function isUserRejection(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /reject|cancel|denied/i.test(message);
}

export const kaiaAdapter: AuthAdapter = {
  platform: 'kaia',

  async init() {
    // Kept as a single promise: React may mount twice in StrictMode and the
    // DappPortal SDK opens a wallet session on init, which must not happen twice.
    initPromise ??= bootstrap().catch((error: unknown) => {
      initPromise = null;
      throw error;
    });
    return initPromise;
  },

  isAvailable() {
    return sdk !== null;
  },

  async signIn({ nonce, hmac }: AuthChallenge) {
    await this.init();
    if (!sdk) {
      throw new AuthError('unavailable', 'Kaia wallet is not ready. Please reload and try again.');
    }

    const walletProvider = sdk.getWalletProvider();

    let account: string | undefined;
    let signature: string | undefined;
    try {
      const result = (await walletProvider.request({
        method: 'kaia_connectAndSign',
        params: [SIGN_IN_MESSAGE],
      })) as string[];
      [account, signature] = result;
    } catch (error) {
      throw new AuthError(
        isUserRejection(error) ? 'cancelled' : 'unavailable',
        isUserRejection(error)
          ? 'Wallet connection was cancelled.'
          : 'Wallet connection failed. Please try again.',
      );
    }

    if (!account || !signature) {
      throw new AuthError('cancelled', 'Wallet returned no signature.');
    }

    await authApi
      .completeKaia({
        nonce,
        hmac,
        payload: {
          status: 'success',
          message: SIGN_IN_MESSAGE,
          signature,
          address: account,
          version: 1,
        },
      })
      .catch(() => {
        throw new AuthError('rejected', 'Sign-in could not be completed. Please try again.');
      });
  },
};
