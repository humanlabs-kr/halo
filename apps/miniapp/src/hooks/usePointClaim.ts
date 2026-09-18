import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useConnection, useWriteContract } from 'wagmi';
import { POINT_CLAIM_ABI } from '@halo/contracts';
import { MiniKit, VerificationLevel } from '@worldcoin/minikit-js';
import { pointApi } from '@/lib/api/point';
import { pointStatQueryKey, receiptsQueryKey } from '@/lib/api/queries';
import { sendSuccessNotificationHaptic } from '@/lib/haptic';
import { PLATFORM_CHAIN } from '@/lib/wagmi';
import { useAuthStore } from '@/stores/auth';

/**
 * Claiming points is the one flow that genuinely differs per chain.
 *
 * - `celo`  — points are minted on-chain. The server signs a per-receipt claim
 *             and the wallet sends the transaction, so claims are one receipt
 *             at a time and the user pays for each.
 * - `world` — the server needs a World ID proof, obtained from MiniKit, and
 *             settles every claimable receipt in one call.
 * - `kaia`  — the server settles everything claimable off-chain; nothing to
 *             sign.
 *
 * `mode` tells the screen where to put the button: next to each receipt, or
 * once at the top of the list.
 */
export type ClaimMode = 'per-receipt' | 'all-at-once';

export interface PointClaim {
  mode: ClaimMode;
  isPending: boolean;
  /** Resolves with the points claimed, or null if the claim did not complete. */
  claimReceipt: (receiptId: string) => Promise<number | null>;
  claimAll: () => Promise<number | null>;
}

const WORLD_CLAIM_ACTION = 'claim-points';

export function usePointClaim(): PointClaim {
  const platform = useAuthStore((s) => s.platform);
  const queryClient = useQueryClient();
  const { address } = useConnection();
  const { mutateAsync: writeContract } = useWriteContract();
  const [isPending, setIsPending] = useState(false);

  const refresh = useCallback(() => {
    void queryClient.refetchQueries({ queryKey: receiptsQueryKey() });
    void queryClient.refetchQueries({ queryKey: pointStatQueryKey() });
  }, [queryClient]);

  const claimReceipt = useCallback(
    async (receiptId: string): Promise<number | null> => {
      if (isPending || platform !== 'celo') return null;
      setIsPending(true);
      try {
        if (!address) return null;

        const claim = await pointApi.claimSingleCelo({ receiptId });
        await writeContract({
          address: claim.contractAddress as `0x${string}`,
          abi: POINT_CLAIM_ABI,
          functionName: 'claimPoints',
          args: [
            BigInt(claim.claimedPoint),
            claim.claimIdBytes32 as `0x${string}`,
            BigInt(claim.deadline),
            claim.signature as `0x${string}`,
          ],
          chain: PLATFORM_CHAIN.celo,
          account: address,
        });

        sendSuccessNotificationHaptic();
        return claim.claimedPoint;
      } catch {
        // The claim call failed, or the wallet rejected the transaction. Either
        // way the server may already have marked the claim spent, so re-read in
        // `finally` rather than guessing at the new balance.
        return null;
      } finally {
        refresh();
        setIsPending(false);
      }
    },
    [address, isPending, platform, refresh, writeContract],
  );

  const claimAll = useCallback(async (): Promise<number | null> => {
    if (isPending || !platform || platform === 'celo') return null;
    setIsPending(true);
    try {
      if (platform === 'world') {
        const { finalPayload } = await MiniKit.commandsAsync.verify({
          action: WORLD_CLAIM_ACTION,
          signal: WORLD_CLAIM_ACTION,
          verification_level: VerificationLevel.Device,
        });
        if (finalPayload.status === 'error') return null;

        const { claimedPoint } = await pointApi.claim({
          platform: 'world',
          proof: finalPayload.proof,
          // MiniKit types this as its own enum; the API takes the literal.
          verification_level:
            finalPayload.verification_level === VerificationLevel.Orb ? 'orb' : 'device',
          merkle_root: finalPayload.merkle_root,
          nullifier_hash: finalPayload.nullifier_hash,
          signal: WORLD_CLAIM_ACTION,
          action: WORLD_CLAIM_ACTION,
        });
        sendSuccessNotificationHaptic();
        return claimedPoint;
      }

      const { claimedPoint } = await pointApi.claim({ platform: 'kaia' });
      sendSuccessNotificationHaptic();
      return claimedPoint;
    } catch {
      return null;
    } finally {
      refresh();
      setIsPending(false);
    }
  }, [isPending, platform, refresh]);

  return {
    mode: platform === 'celo' ? 'per-receipt' : 'all-at-once',
    isPending,
    claimReceipt,
    claimAll,
  };
}
