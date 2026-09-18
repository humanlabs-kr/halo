import { getAddress, type EIP1193Provider } from 'viem';
import { connect, getAccount } from 'wagmi/actions';
import { authApi } from '@/lib/api/auth';
import { getWagmiConfig } from '@/lib/wagmi';
import { AuthError, type AuthAdapter, type AuthChallenge } from './types';

declare global {
  interface Window {
    ethereum?: EIP1193Provider & { isMiniPay?: boolean };
  }
}

/**
 * MiniPay injects an EIP-1193 provider but does not implement `personal_sign`,
 * so there is no signature to verify: the server binds the session to the
 * address returned by `eth_requestAccounts`, gated by the HMAC'd nonce.
 */
export const celoAdapter: AuthAdapter = {
  platform: 'celo',

  async init() {
    // The provider is injected by the host app before our bundle runs.
  },

  isAvailable() {
    return typeof window !== 'undefined' && Boolean(window.ethereum);
  },

  async signIn({ nonce, hmac }: AuthChallenge) {
    const provider = window.ethereum;
    if (!provider) {
      throw new AuthError('unavailable', 'Open this mini app inside MiniPay to sign in.');
    }

    // Connect through wagmi rather than calling `eth_requestAccounts`
    // directly: Celo is the chain that later sends claim and spend
    // transactions, and those hooks read the account from wagmi's store. Going
    // around it would leave the app authenticated but unable to transact.
    let address: `0x${string}`;
    try {
      const config = getWagmiConfig();
      const account = getAccount(config);
      if (account.address) {
        address = account.address;
      } else {
        const connector = config.connectors[0];
        if (!connector) {
          throw new AuthError('unavailable', 'No wallet connector is configured.');
        }
        const result = await connect(config, { connector });
        const first = result.accounts[0];
        if (!first) {
          throw new AuthError('cancelled', 'No wallet account was shared.');
        }
        address = getAddress(first);
      }
    } catch (error) {
      if (error instanceof AuthError) throw error;
      throw new AuthError('cancelled', 'Wallet connection was declined.');
    }

    await authApi.connectCelo({ nonce, hmac, address }).catch(() => {
      throw new AuthError('rejected', 'Sign-in could not be completed. Please try again.');
    });
  },
};
