import { toDataSuffix } from '@celo/attribution-tags';
import type { Hex } from 'viem';
import { PROJECT_ENV } from '@/lib/env';

/** ERC-8021 attribution code Celo issued for Halo. */
const CELO_ATTRIBUTION_CODE = 'celo_rp4qk2dj';

/**
 * ERC-8021 suffix for Celo transactions, passed to wagmi as `dataSuffix`.
 *
 * It lands after the ABI-encoded arguments. The point-claim contract decodes
 * only the arguments and never reads raw `msg.data`, so the bytes change
 * nothing on-chain; Celo's indexer reads them to credit the transaction to us.
 *
 * Production only: staging also sends real Celo mainnet transactions, and our
 * own testing is not activity to be credited. `undefined` sends untagged, which
 * is also the fallback if encoding ever throws — attribution must never be the
 * reason a claim fails. Platform codes such as `minipay` are the wallet's to
 * add, not ours.
 */
export const CELO_DATA_SUFFIX: Hex | undefined = (() => {
  if (PROJECT_ENV !== 'production') return undefined;
  try {
    return toDataSuffix(CELO_ATTRIBUTION_CODE) as Hex;
  } catch (error) {
    console.error('[attribution] invalid Celo attribution code', error);
    return undefined;
  }
})();
