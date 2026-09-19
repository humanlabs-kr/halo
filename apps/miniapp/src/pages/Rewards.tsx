import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import { useFormatters } from '@/lib/format';
import utc from 'dayjs/plugin/utc';
import PageHeader from '@/components/PageHeader';
import RaffleCountdownCard from '@/components/RaffleCountdownCard';
import RaffleEntrySheet from '@/components/RaffleEntrySheet';
import SectionHeading from '@/components/SectionHeading';
import { useRafflePools, useRaffleStats } from '@/lib/api/queries';
import { type RafflePool } from '@/lib/api/raffle';
import { platformFeatures, REWARD_CURRENCY } from '@/lib/constants';
import { sendLightImpactHaptic } from '@/lib/haptic';
import { useAuthStore } from '@/stores/auth';
import { useEmailVerificationStore } from '@/stores/emailVerification';

// Retained for UTC arithmetic only — the round closes at UTC midnight and the
// countdown below is a difference, not a formatted date.
dayjs.extend(utc);

function Rewards() {
  const { t } = useTranslation();
  const fmt = useFormatters();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const platform = useAuthStore((s) => s.platform);
  const { isVerified, checkStatus } = useEmailVerificationStore();
  const needsVerifiedEmail = platformFeatures(platform).raffleNeedsVerifiedEmail;

  const [remainingMs, setRemainingMs] = useState(0);
  const [selectedPool, setSelectedPool] = useState<RafflePool | null>(null);

  const {
    data: pools,
    isLoading: isPoolsLoading,
    isFetching: isPoolsFetching,
    refetch: refetchPools,
  } = useRafflePools(platform);

  // Lifetime payout totals across all chains. Public endpoint, no auth.
  const { data: stats } = useRaffleStats();

  useEffect(() => {
    if (platform && needsVerifiedEmail) void checkStatus(platform);
  }, [checkStatus, needsVerifiedEmail, platform]);

  // Rounds close at UTC midnight.
  useEffect(() => {
    const tick = () => {
      const nowUTC = dayjs().utc();
      setRemainingMs(nowUTC.add(1, 'day').startOf('day').diff(nowUTC));
    };
    tick();
    const intervalId = window.setInterval(tick, 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  const countdown = useMemo(() => {
    const pad = (value: number) => String(value).padStart(2, '0');
    return {
      hours: pad(Math.floor(remainingMs / 3_600_000)),
      minutes: pad(Math.floor((remainingMs % 3_600_000) / 60_000)),
      seconds: pad(Math.floor((remainingMs % 60_000) / 1000)),
    };
  }, [remainingMs]);

  const handleRaffleEnter = (pool: RafflePool) => {
    if (pool.isClosed) return;
    sendLightImpactHaptic();

    // Chains we pay out ourselves need a reachable address, and their entry
    // endpoint rejects an unverified one with EMAIL_NOT_VERIFIED. World's does
    // not — winners there claim through a Drop link — so asking for an email
    // first would block an entry the server would have accepted.
    if (needsVerifiedEmail && !isVerified) {
      navigate('/verify-email?returnTo=/rewards');
      return;
    }
    setSelectedPool(pool);
  };

  const handleEntrySheetClose = () => {
    setSelectedPool(null);
    void queryClient.invalidateQueries({ queryKey: ['raffle', 'pools', platform] });
  };

  return (
    <div className="flex min-h-screen flex-col bg-white text-black">
      <div className="px-4 pt-6">
        <PageHeader title={t('L-42p9Zgx7')} />
      </div>

      <div className="flex-1 px-4 pb-4">
        <RaffleCountdownCard {...countdown} />

        {stats && stats.totalPrizesAwarded > 0 && (
          <button
            type="button"
            className="pressed mt-6 w-full rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 px-4 py-3 text-left ring-1 ring-emerald-200/50"
            onClick={() => {
              sendLightImpactHaptic();
              navigate('/payouts');
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-emerald-700/70">{t('Total prizes awarded')}</p>
                <p className="text-lg font-bold text-emerald-700">
                  ${fmt.number(stats.totalPrizesAwarded, { maximumFractionDigits: 0 })}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-emerald-700/70">{t('Winners')}</p>
                <p className="text-lg font-bold text-emerald-700">
                  {fmt.number(stats.totalPrizesAwardedCount)}
                </p>
              </div>
            </div>
            <div className="mt-2 flex items-center justify-center gap-1 text-xs text-emerald-600/70">
              <span>{t('View all payouts')}</span>
              <svg
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-3 w-3"
              >
                <path d="M8 5l5 5-5 5" />
              </svg>
            </div>
          </button>
        )}

        <div className="mt-6 flex items-center justify-between">
          <SectionHeading
            className="!mt-0"
            title={t('L-65bazsbh')}
            subtitle={t('L-xAz2KJ1u')}
            actionIcon
            onClick={() => {
              sendLightImpactHaptic();
              navigate('/raffle-history');
            }}
          />
          <button
            type="button"
            onClick={() => {
              sendLightImpactHaptic();
              void refetchPools();
            }}
            disabled={isPoolsFetching}
            className={`flex h-8 w-8 items-center justify-center rounded-full bg-[#F4F4F4] transition hover:bg-[#E5E5E5] ${
              isPoolsFetching ? 'animate-spin' : ''
            }`}
            aria-label={t('Refresh raffles')}
          >
            <svg
              className="h-4 w-4 text-[#666]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        </div>

        <div className="mt-3 space-y-2">
          {isPoolsLoading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-24 animate-pulse rounded-[28px] bg-[#F4F4F4]" />
            ))
          ) : pools && pools.length > 0 ? (
            pools.map((pool) => (
              <RafflePoolCard
                key={pool.id}
                pool={pool}
                currency={platform ? REWARD_CURRENCY[platform] : ''}
                onEnter={() => handleRaffleEnter(pool)}
              />
            ))
          ) : (
            <div className="py-8 text-center text-sm text-[#8D8D8D]">
              {t('No raffle pools available today')}
            </div>
          )}
        </div>
      </div>

      {selectedPool && (
        <RaffleEntrySheet open onClose={handleEntrySheetClose} pool={selectedPool} />
      )}
    </div>
  );
}

function RafflePoolCard({
  pool,
  currency,
  onEnter,
}: {
  pool: RafflePool;
  currency: string;
  onEnter: () => void;
}) {
  const { t } = useTranslation();
  const fmt = useFormatters();

  return (
    <article
      onClick={pool.isClosed ? undefined : onEnter}
      className={`flex items-center justify-between rounded-[28px] bg-[#F4F4F4] px-5 py-4.5 ${
        pool.isClosed ? '' : 'pressed cursor-pointer'
      }`}
    >
      <div className="flex-1">
        <p className="mb-1 text-base font-semibold text-black">
          {fmt.amount(pool.amount)} {currency}
        </p>
        <p className="mb-1 text-xs text-[#8D8D8D]">
          {t('Use {{count}} pts', { count: pool.pointPerEntry })}
          {' / '}
          {pool.maxEntriesPerUser === -1
            ? t('Unlimited entries')
            : t('Max {{count}} entries per day', { count: pool.maxEntriesPerUser })}
        </p>
        <p className="text-xs text-[#8D8D8D]">
          {t('Mine:')}{' '}
          <span className="font-semibold text-black">
            {fmt.number(pool.userEntryCount)}
          </span>{' '}
          · {t('Total:')}{' '}
          <span className="font-semibold text-black">
            {fmt.number(pool.totalEntryCount)}
          </span>
        </p>
      </div>
      {pool.isClosed ? (
        <div className="rounded-full bg-[#D6D6D6] px-5 py-2 text-sm font-semibold text-white opacity-70">
          {t('L-Qz7oUkLD')}
        </div>
      ) : (
        <button
          type="button"
          className="rounded-full bg-black px-5 py-2 text-sm font-semibold text-white"
          onClick={(e) => {
            e.stopPropagation();
            onEnter();
          }}
        >
          {t('L-TBJ2APz1')}
        </button>
      )}
    </article>
  );
}

export default Rewards;
