import type { Platform } from "@halo/contracts";
import { useState } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import utc from "dayjs/plugin/utc";
import { useRaffleHistory } from "@/lib/api/queries";
import { type RaffleHistoryView } from "@/lib/api/raffle";
import { EXPLORER_TX_URL, REWARD_CURRENCY } from "@/lib/constants";
import { useAuthStore } from "@/stores/auth";

dayjs.extend(relativeTime);
dayjs.extend(utc);
dayjs.locale("en");

function RaffleHistory() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const platform = useAuthStore((s) => s.platform);
  // Start with yesterday's date in YYYY-MM-DD format (UTC)
  const [selectedDate, setSelectedDate] = useState(() =>
    dayjs().utc().subtract(1, "day").format("YYYY-MM-DD")
  );

  const { data: apiData, isLoading, error } = useRaffleHistory(platform, selectedDate);

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
            aria-label="Go back"
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
            aria-label="Previous date"
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
            {dayjs(selectedDate).format("MMM D, YYYY")}
          </span>
          <button
            type="button"
            onClick={handleNext}
            disabled={!canGoNext}
            className={`flex size-10 items-center justify-center rounded-full bg-[#F4F4F4] transition hover:bg-[#E5E5E5] ${
              !canGoNext ? "cursor-not-allowed opacity-40" : ""
            }`}
            aria-label="Next date"
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
            <p className="mt-4 text-sm text-[#8D8D8D]">Loading...</p>
          </div>
        ) : error ? (
          <div className="mt-8 flex flex-col items-center justify-center py-12">
            <p className="mb-1.5 text-base font-semibold text-black">
              Error loading raffle history
            </p>
            <p className="mb-6 text-center text-sm text-[#8D8D8D]">
              Please try again later
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
}: {
  date: string;
  data: RaffleHistoryView;
  platform: Platform | null;
}) {
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
          <p className="mb-0.5 text-lg font-bold text-black">
            {dayjs(date).format("MMM D, YYYY")}
          </p>
          <p className="text-xs text-[#8D8D8D]">
            Drawn {dayjs(drawDate).fromNow()} ·{" "}
            {data.totalEntryCount.toLocaleString()} entries
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
            {allSettled ? "Paid" : "Won - pending payout"}
          </span>
        )}
        {isLost && (
          <span className="ml-3 inline-flex shrink-0 items-center rounded-full bg-rose-100/80 px-3 py-1 text-xs font-semibold text-rose-500/80">
            Lost
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
                {pool.amount} {currency}
              </span>
              {pool.winner ? (
                <span className="truncate text-right text-xs text-[#666666]">
                  @{pool.winner.username || pool.winner.address.slice(0, 10) + "..."}
                </span>
              ) : (
                <span className="text-xs text-[#8D8D8D]">No entries</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* My Rewards Section */}
      {isWon && data.myRewards.length > 0 && (
        <div className="border-t border-[#E5E5E5] pt-4">
          <p className="mb-3 text-xs text-[#8D8D8D]">
            Your Reward{data.myRewards.length > 1 ? "s" : ""} (
            {totalRewardAmount.toLocaleString(undefined, {
              maximumFractionDigits: 2,
            })}{" "}
            {currency})
          </p>
          <div className="space-y-2.5">
            {data.myRewards.map((reward, index) => (
              <div key={index} className="flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-base font-bold text-black">
                    {reward.amount} {currency}
                  </p>
                </div>
                <RewardSettlement reward={reward} platform={platform} />
              </div>
            ))}
          </div>
          {!allSettled && (
            <p className="mt-3 text-xs text-[#8D8D8D]">
              {data.myRewards.some((reward) => reward.claimUrl)
                ? "Tap Claim to collect your prize."
                : `Payouts are processed at the end of each month. You will receive ${currency} in your wallet.`}
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
}: {
  reward: RaffleHistoryView["myRewards"][number];
  platform: Platform | null;
}) {
  const settled = reward.settledAt !== null;

  if (!settled && reward.claimUrl) {
    return (
      <a
        href={reward.claimUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0 rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white shadow-sm"
      >
        Claim
      </a>
    );
  }

  if (!settled) {
    return (
      <div className="shrink-0 rounded-full bg-amber-100 px-5 py-2.5 text-sm font-semibold text-amber-700">
        Pending
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
        View TX
      </a>
    );
  }

  return (
    <div className="shrink-0 rounded-full bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm ring-2 ring-emerald-400/50">
      Paid
    </div>
  );
}

function EmptyState() {
  return (
    <div className="mt-8 flex flex-col items-center justify-center py-12">
      <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-[#F4F4F4]">
        <img src="/u_gift.svg" alt="Raffle" className="h-8 w-8 opacity-40" />
      </div>
      <p className="mb-1.5 text-base font-semibold text-black">
        No raffle entries
      </p>
      <p className="mb-6 text-center text-sm text-[#8D8D8D]">
        Join raffle pools to see results here
      </p>
    </div>
  );
}

export default RaffleHistory;
