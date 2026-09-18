import type { Platform } from '@halo/contracts';

/** Scan quota shown in the progress card and enforced by the API. */
export const SCAN_LIMIT = {
  daily: 5,
  weekly: 35,
} as const;

/**
 * Stablecoin each chain pays raffle rewards in. Only a display label — the
 * amounts come from the API already denominated in this currency.
 */
export const REWARD_CURRENCY: Record<Platform, string> = {
  world: 'USDC',
  celo: 'USDT',
  kaia: 'USDT',
};

/** Block explorer used to link a payout transaction, per chain. */
export const EXPLORER_TX_URL: Record<Platform, string> = {
  world: 'https://worldscan.org/tx/',
  celo: 'https://celoscan.io/tx/',
  kaia: 'https://kaiascan.io/tx/',
};

/** Public Halo account, linked from the home feed. */
export const HALO_SOCIAL_URL = 'https://x.com/HaloReceipts';
