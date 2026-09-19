import type { Platform } from '@halo/contracts';
import {
  skipToken,
  useMutation,
  useQuery,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import {
  pointApi,
  type ClaimedPoint,
  type OnchainClaim,
  type PointLogList,
  type PointLogsQuery,
  type PointStat,
} from './point';
import {
  fetchRaffleHistory,
  fetchRafflePools,
  raffleApi,
  type HaloRaffleChain,
  type HaloRafflePayouts,
  type RaffleHistoryView,
  type RafflePayoutsQuery,
  type RafflePool,
  type RaffleStats,
} from './raffle';
import {
  receiptApi,
  type ReceiptDetail,
  type ReceiptList,
  type ReceiptStat,
  type ReceiptTotalCount,
} from './receipt';

/**
 * React Query bindings for the domain clients in this folder.
 *
 * Every key is exported as a function so a caller can invalidate a query it
 * does not itself run — `usePointClaim` refetches the point stat and the
 * receipt list after a claim, and a literal `['point', 'stat']` typed out at
 * that call site would silently stop matching the day this file renames it.
 *
 * Errors arrive as whatever the transport threw: `ApiRequestError` for a
 * response the server produced, a plain `TypeError` for a connection that
 * never got one. Branch with `hasApiErrorCode`, which handles both.
 */

/** The query options screens actually vary. Anything broader invites drift. */
export interface QueryTuning {
  enabled?: boolean;
  refetchInterval?: number;
  staleTime?: number;
}

/** Mutation callbacks, kept narrow for the same reason as `QueryTuning`. */
export interface MutationCallbacks<TData> {
  onSuccess?: (data: TData) => void | Promise<void>;
  onError?: (error: Error) => void;
}

// ── Point ───────────────────────────────────────────────────────────────────

export const pointStatQueryKey = () => ['point', 'stat'] as const;

export function usePointStat(tuning: QueryTuning = {}): UseQueryResult<PointStat, Error> {
  return useQuery({
    queryKey: pointStatQueryKey(),
    queryFn: () => pointApi.stat(),
    ...tuning,
  });
}

export const pointLogsQueryKey = (query: PointLogsQuery) => ['point', 'logs', query] as const;

export function usePointLogs(query: PointLogsQuery): UseQueryResult<PointLogList, Error> {
  return useQuery({
    queryKey: pointLogsQueryKey(query),
    queryFn: () => pointApi.logs(query),
  });
}

export function useClaimDailyPoint(
  callbacks: MutationCallbacks<ClaimedPoint> = {},
): UseMutationResult<ClaimedPoint, Error, void> {
  return useMutation({ mutationFn: () => pointApi.claimDaily(), ...callbacks });
}

export function useClaimDailyPointCelo(
  callbacks: MutationCallbacks<OnchainClaim> = {},
): UseMutationResult<OnchainClaim, Error, void> {
  return useMutation({ mutationFn: () => pointApi.claimDailyCelo(), ...callbacks });
}

// ── Receipt ─────────────────────────────────────────────────────────────────

export const receiptsQueryKey = () => ['receipt', 'list'] as const;

export function useReceipts(tuning: QueryTuning = {}): UseQueryResult<ReceiptList, Error> {
  return useQuery({
    queryKey: receiptsQueryKey(),
    queryFn: () => receiptApi.list(),
    ...tuning,
  });
}

export const receiptQueryKey = (receiptId: string) => ['receipt', 'detail', receiptId] as const;

export function useReceipt(receiptId: string | undefined): UseQueryResult<ReceiptDetail, Error> {
  return useQuery({
    queryKey: receiptQueryKey(receiptId ?? ''),
    // `skipToken` rather than `enabled` plus a non-null assertion: it is the
    // absence of an id that makes the request impossible, and this way the
    // type system agrees instead of being told to look away.
    queryFn: receiptId ? () => receiptApi.byId(receiptId) : skipToken,
  });
}

export const receiptStatQueryKey = () => ['receipt', 'stat'] as const;

export function useReceiptStat(tuning: QueryTuning = {}): UseQueryResult<ReceiptStat, Error> {
  return useQuery({
    queryKey: receiptStatQueryKey(),
    queryFn: () => receiptApi.stat(),
    ...tuning,
  });
}

export const receiptTotalCountQueryKey = () => ['receipt', 'total-count'] as const;

export function useReceiptTotalCount(
  tuning: QueryTuning = {},
): UseQueryResult<ReceiptTotalCount, Error> {
  return useQuery({
    queryKey: receiptTotalCountQueryKey(),
    queryFn: () => receiptApi.totalCount(),
    ...tuning,
  });
}

// ── Raffle ──────────────────────────────────────────────────────────────────

/**
 * Pools are keyed per platform; calling this with no platform yields the
 * prefix, which invalidates every platform's pools at once.
 */
export function rafflePoolsQueryKey(platform?: Platform | null): readonly unknown[] {
  return platform ? ['raffle', 'pools', platform] : ['raffle', 'pools'];
}

export function useRafflePools(
  platform: Platform | null,
): UseQueryResult<RafflePool[], Error> {
  return useQuery({
    queryKey: rafflePoolsQueryKey(platform),
    queryFn: platform ? () => fetchRafflePools(platform) : skipToken,
    refetchInterval: 30_000,
  });
}

export const raffleHistoryQueryKey = (platform: Platform | null, date: string) =>
  ['raffle', 'history', platform, date] as const;

export function useRaffleHistory(
  platform: Platform | null,
  date: string,
  tuning: QueryTuning = {},
): UseQueryResult<RaffleHistoryView, Error> {
  return useQuery({
    queryKey: raffleHistoryQueryKey(platform, date),
    queryFn: platform ? () => fetchRaffleHistory(platform, date) : skipToken,
    ...tuning,
  });
}

export const raffleStatsQueryKey = () => ['raffle', 'stats'] as const;

export function useRaffleStats(): UseQueryResult<RaffleStats, Error> {
  return useQuery({
    queryKey: raffleStatsQueryKey(),
    queryFn: () => raffleApi.stats(),
    staleTime: 60_000,
  });
}

export const rafflePayoutsQueryKey = (
  chain: HaloRaffleChain | null,
  query: RafflePayoutsQuery,
) => ['raffle', 'payouts', chain, query] as const;

export function useRafflePayouts(
  chain: HaloRaffleChain | null,
  query: RafflePayoutsQuery,
): UseQueryResult<HaloRafflePayouts, Error> {
  return useQuery({
    queryKey: rafflePayoutsQueryKey(chain, query),
    queryFn: chain ? () => raffleApi.payouts(chain, query) : skipToken,
  });
}
