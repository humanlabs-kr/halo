import type { Platform } from "@halo/contracts";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { useFormatters } from "@/lib/format";
import { useRaffleHistory } from "@/lib/api/queries";
import { type RaffleHistoryView } from "@/lib/api/raffle";
import { EXPLORER_TX_URL, REWARD_CURRENCY } from "@/lib/constants";
import { useAuthStore } from "@/stores/auth";

// Retained for UTC date arithmetic only — the round key below is a machine
// string and must stay "YYYY-MM-DD" in every language. Everything the user
// reads goes through `useFormatters`.
dayjs.extend(utc);

/**
 * How often to re-read the round while a claim is in flight.
 *
 * A World prize is claimed on Drop Protocol's own page, outside this app, so
 * nothing tells us when it lands — the server is simply asked again until the
 * reward comes back settled. Without this the user returns to an unchanged
 * "Claim" button and taps it a second time.
 */
const CLAIM_POLL_INTERVAL_MS = 2_000;

function RaffleHistory() {
  const { t } = useTranslation();
  const fmt = useFormatters();
  const navigate = useNavigate();
  const platform = useAuthStore((s) => s.platform);
  // Start with yesterday's date in YYYY-MM-DD format (UTC)
  const [selectedDate, setSelectedDate] = useState(() =>
    dayjs().utc().subtract(1, "day").format("YYYY-MM-DD")
  );

  // Claim links the user has opened but that have not settled yet, keyed by
  // the link itself — one reward, one link.
  const [claimingUrls, setClaimingUrls] = useState<ReadonlySet<string>>(
    () => new Set()
  );

  const {
    data: apiData,
    isLoading,
    error,
  } = useRaffleHistory(platform, selectedDate, {
    refetchInterval: claimingUrls.size > 0 ? CLAIM_POLL_INTERVAL_MS : undefined,
  });

  const startClaim = useCallback((claimUrl: string) => {
    setClaimingUrls((previous) => new Set(previous).add(claimUrl));
    // The claim page belongs to Drop Protocol, not to us; opening it in a new
    // context keeps the app mounted so the poll above can see it complete.
    window.open(claimUrl, "_blank", "noopener,noreferrer");
  }, []);

  // Stop polling for a reward once the server reports it settled.
  useEffect(() => {
    if (claimingUrls.size === 0) return;

    const settled = (apiData?.myRewards ?? [])
      .filter((reward) => reward.settledAt !== null)
      .map((reward) => reward.claimUrl)
      .filter((url): url is string => url !== undefined && claimingUrls.has(url));

    if (settled.length === 0) return;
    setClaimingUrls((previous) => {
      const next = new Set(previous);
      for (const url of settled) next.delete(url);
      return next;
    });
  }, [apiData, claimingUrls]);

  // A date change reopens a different round; anything in flight belongs to the
  // one being left behind, and keeping it would poll the wrong query forever.
  useEffect(() => {
    setClaimingUrls(new Set());
  }, [selectedDate]);

  const handlePrevious = () => {
    const previousDate = dayjs(selectedDate)
      .subtract(1, "day")
      .format("YYYY-MM-DD");
    setSelectedDate(previousDate);
  };

  const handleNext = () => {
    const nextDate = dayjs(selectedDate).add(1, "day").format("YYYY-MM-DD");
    // Don't allow going beyond yesterday (UTC)
    const yesterdayUTC = dayjs().utc().subtract(1, "day");
    if (
      dayjs(nextDate).isBefore(yesterdayUTC, "day") ||
      dayjs(nextDate).isSame(yesterdayUTC, "day")
    ) {
      setSelectedDate(nextDate);
    }
  };

  // Can go to next date if it's before or equal to yesterday (UTC)
  const nextDate = dayjs(selectedDate).add(1, "day");
  const yesterdayUTC = dayjs().utc().subtract(1, "day");
  const canGoNext =
    nextDate.isBefore(yesterdayUTC, "day") ||
    nextDate.isSame(yesterdayUTC, "day");

  return (
    <div className="flex min-h-screen flex-col bg-white text-black">
      <div className="px-5 pt-6">
        <div className="mb-1 flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              navigate(-1);
            }}
            className="flex size-10 items-center justify-center rounded-full bg-[#F4F4F4] transition hover:bg-[#E5E5E5]"
            aria-label={t("Go back")}
          >
            <svg
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5 text-black"
            >
              <path d="M12 15l-5-5 5-5" />
            </svg>
          </button>
          <h1 className="text-2xl font-bold">{t("L-65bazsbh")}</h1>
        </div>
      </div>

      {/* Date Selector */}
      <div className="px-5 pb-2 pt-4">
        <div className="flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={handlePrevious}
            className="flex size-10 items-center justify-center rounded-full bg-[#F4F4F4] transition hover:bg-[#E5E5E5]"
            aria-label={t("Previous date")}
          >
            <svg
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5 text-black"
            >
              <path d="M12 15l-5-5 5-5" />
            </svg>
          </button>
          <span className="min-w-[140px] text-center text-lg font-semibold text-black">
            {fmt.date(selectedDate)}
          </span>
          <button
            type="button"
            onClick={handleNext}
            disabled={!canGoNext}
            className={`flex size-10 items-center justify-center rounded-full bg-[#F4F4F4] transition hover:bg-[#E5E5E5] ${
              !canGoNext ? "cursor-not-allowed opacity-40" : ""
            }`}
            aria-label={t("Next date")}
          >
            <svg
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5 text-black"
            >
              <path d="M8 5l5 5-5 5" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {isLoading ? (
          <div className="mt-8 flex flex-col items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#F4F4F4] border-t-black" />
            <p className="mt-4 text-sm text-[#8D8D8D]">{t("L-W9Q0CklX")}</p>
          </div>
        ) : error ? (
          <div className="mt-8 flex flex-col items-center justify-center py-12">
            <p className="mb-1.5 text-base font-semibold text-black">
              {t("Error loading raffle history")}
            </p>
            <p className="mb-6 text-center text-sm text-[#8D8D8D]">
              {t("Please try again later")}
            </p>
          </div>
        ) : !apiData || apiData.pools.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="mt-4">
            <RaffleRoundCard
              key={selectedDate}
              date={selectedDate}
              data={apiData}
              platform={platform}
              claimingUrls={claimingUrls}
              onClaim={startClaim}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function RaffleRoundCard({
  date,
  data,
  platform,
  claimingUrls,
  onClaim,
}: {
  date: string;
  data: RaffleHistoryView;
  platform: Platform | null;
  claimingUrls: ReadonlySet<string>;
  onClaim: (claimUrl: string) => void;
}) {
  const { t } = useTranslation();
  const fmt = useFormatters();
  const currency = platform ? REWARD_CURRENCY[platform] : "";
  const isWon = data.myRewards.length > 0;
  const isLost = !isWon && data.totalEntryCount > 0;
  const allSettled = isWon && data.myRewards.every((reward) => reward.settledAt !== null);
  const totalRewardAmount = data.myRewards.reduce((sum, reward) => sum + reward.amount, 0);

  // The draw runs at the end of the day the round covers.
  const drawDate = dayjs(date).add(12, "hours").toISOString();

  return (
    <article className="rounded-[28px] bg-[#F4F4F4] px-5 py-5">
      {/* Round Header */}
      <div className="mb-4 flex items-start justify-between">
        <div className="flex-1">
          <p className="mb-0.5 text-lg font-bold text-black">{fmt.date(date)}</p>
          <p className="text-xs text-[#8D8D8D]">
            {t("Drawn {{when}} · {{entries}} entries", {
              when: fmt.relative(drawDate),
              entries: fmt.number(data.totalEntryCount),
            })}
          </p>
        </div>
        {isWon && (
          <span
            className={`ml-3 inline-flex shrink-0 items-center rounded-full px-3 py-1 text-xs font-semibold ${
              allSettled
                ? "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-300/60"
                : "bg-amber-100 text-amber-700"
            }`}
          >
            {allSettled ? t("Paid") : t("Won - pending payout")}
          </span>
        )}
        {isLost && (
          <span className="ml-3 inline-flex shrink-0 items-center rounded-full bg-rose-100/80 px-3 py-1 text-xs font-semibold text-rose-500/80">
            {t("Lost")}
          </span>
        )}
      </div>

      {/* Winners List */}
      <div className="space-y-0">
        {data.pools.map((pool, index) => (
          <div
            key={index}
            className="border-b border-[#E5E5E5] py-2.5 first:pt-0 last:border-0"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="shrink-0 text-sm font-semibold text-black">
                {fmt.amount(pool.amount)} {currency}
              </span>
              {pool.winner ? (
                <span className="truncate text-right text-xs text-[#666666]">
                  @{pool.winner.username || pool.winner.address.slice(0, 10) + "..."}
                </span>
              ) : (
                <span className="text-xs text-[#8D8D8D]">{t("No entries")}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* My Rewards Section */}
      {isWon && data.myRewards.length > 0 && (
        <div className="border-t border-[#E5E5E5] pt-4">
          <p className="mb-3 text-xs text-[#8D8D8D]">
            {t(
              data.myRewards.length > 1
                ? "Your Rewards ({{amount}} {{currency}})"
                : "Your Reward ({{amount}} {{currency}})",
              {
                amount: fmt.amount(totalRewardAmount),
                currency,
              },
            )}
          </p>
          <div className="space-y-2.5">
            {data.myRewards.map((reward, index) => (
              <div key={index} className="flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-base font-bold text-black">
                    {fmt.amount(reward.amount)} {currency}
                  </p>
                </div>
                <RewardSettlement
                  reward={reward}
                  platform={platform}
                  isClaiming={
                    reward.claimUrl !== undefined &&
                    claimingUrls.has(reward.claimUrl)
                  }
                  onClaim={onClaim}
                />
              </div>
            ))}
          </div>
          {!allSettled && (
            <p className="mt-3 text-xs text-[#8D8D8D]">
              {data.myRewards.some((reward) => reward.claimUrl)
                ? t("Tap Claim to collect your prize.")
                : t(
                    "Payouts are processed at the end of each month. You will receive {{currency}} in your wallet.",
                    { currency },
                  )}
            </p>
          )}
        </div>
      )}
    </article>
  );
}

/**
 * How a prize reaches the winner differs by chain: World hands out a claim
 * link the user opens themselves, the other chains are paid out by us and
 * show the payout transaction once it has been sent.
 */
function RewardSettlement({
  reward,
  platform,
  isClaiming,
  onClaim,
}: {
  reward: RaffleHistoryView["myRewards"][number];
  platform: Platform | null;
  isClaiming: boolean;
  onClaim: (claimUrl: string) => void;
}) {
  const { t } = useTranslation();
  const settled = reward.settledAt !== null;
  const claimUrl = reward.claimUrl;

  if (!settled && claimUrl) {
    return (
      <button
        type="button"
        onClick={() => onClaim(claimUrl)}
        disabled={isClaiming}
        className={`flex shrink-0 items-center gap-2 rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white shadow-sm ${
          isClaiming ? "cursor-not-allowed opacity-50" : ""
        }`}
      >
        {isClaiming ? (
          <>
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            <span>{t("L-qHrxRpu3")}</span>
          </>
        ) : (
          t("L-HZTnPZQA")
        )}
      </button>
    );
  }

  if (!settled) {
    return (
      <div className="shrink-0 rounded-full bg-amber-100 px-5 py-2.5 text-sm font-semibold text-amber-700">
        {t("Pending")}
      </div>
    );
  }

  if (reward.txHash && platform) {
    return (
      <a
        href={`${EXPLORER_TX_URL[platform]}${reward.txHash}`}
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0 rounded-full bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm ring-2 ring-emerald-400/50"
      >
        {t("View TX")}
      </a>
    );
  }

  return (
    <div className="shrink-0 rounded-full bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm ring-2 ring-emerald-400/50">
      {t("Paid")}
    </div>
  );
}

function EmptyState() {
  const { t } = useTranslation();

  return (
    <div className="mt-8 flex flex-col items-center justify-center py-12">
      <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-[#F4F4F4]">
        <img src="/u_gift.svg" alt={t("L-EbJnZmoR")} className="h-8 w-8 opacity-40" />
      </div>
      <p className="mb-1.5 text-base font-semibold text-black">
        {t("No raffle entries")}
      </p>
      <p className="mb-6 text-center text-sm text-[#8D8D8D]">
        {t("Join raffle pools to see results here")}
      </p>
    </div>
  );
}

export default RaffleHistory;
