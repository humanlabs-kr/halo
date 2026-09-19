import { useState } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { useFormatters } from "@/lib/format";
import { useRafflePayouts } from "@/lib/api/queries";
import type { HaloRaffleChain, HaloRafflePayout } from "@/lib/api/raffle";
import { EXPLORER_TX_URL, REWARD_CURRENCY } from "@/lib/constants";
import { useAuthStore } from "@/stores/auth";

function Payouts() {
  const { t } = useTranslation();
  const fmt = useFormatters();
  const navigate = useNavigate();
  const platform = useAuthStore((s) => s.platform);
  const [page, setPage] = useState(1);
  const limit = 20;

  // Payout records only exist for the chains we settle ourselves. On World the
  // winner claims the prize directly, so there is no payout ledger to show.
  const chain: HaloRaffleChain | null =
    platform === "celo" || platform === "kaia" ? platform : null;
  const currency = platform ? REWARD_CURRENCY[platform] : "";

  const {
    data: apiData,
    isLoading,
    error,
    isFetching,
  } = useRafflePayouts(chain, { limit, offset: (page - 1) * limit });

  const totalPages = apiData ? Math.ceil(apiData.total / limit) : 0;

  const handlePrevious = () => {
    if (page > 1) {
      setPage((prev) => prev - 1);
      window.scrollTo(0, 0);
    }
  };

  const handleNext = () => {
    if (page < totalPages) {
      setPage((prev) => prev + 1);
      window.scrollTo(0, 0);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-white text-black">
      <div className="px-5 pt-6">
        <div className="mb-1 flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
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
          <h1 className="text-2xl font-bold">{t("Payouts")}</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {/* Summary Banner */}
        {apiData && apiData.summary.totalPaidCount > 0 && (
          <div className="mt-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 px-5 py-4 ring-1 ring-emerald-200/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-emerald-700/70">{t("Total Paid Out")}</p>
                <p className="text-xl font-bold text-emerald-700">
                  $
                  {fmt.number(apiData.summary.totalPaid, {
                    maximumFractionDigits: 2,
                  })}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-emerald-700/70">{t("Winners")}</p>
                <p className="text-xl font-bold text-emerald-700">
                  {fmt.number(apiData.summary.totalPaidCount)}
                </p>
              </div>
            </div>
            <p className="mt-2 text-center text-xs text-emerald-600/60">
              {t("All payouts verified on-chain")}
            </p>
          </div>
        )}

        {isLoading || isFetching ? (
          <div className="mt-8 flex flex-col items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#F4F4F4] border-t-black" />
            <p className="mt-4 text-sm text-[#8D8D8D]">{t("L-W9Q0CklX")}</p>
          </div>
        ) : error ? (
          <div className="mt-8 flex flex-col items-center justify-center py-12">
            <p className="mb-1.5 text-base font-semibold text-black">
              {t("Error loading payouts")}
            </p>
            <p className="mb-6 text-center text-sm text-[#8D8D8D]">
              {t("Please try again later")}
            </p>
          </div>
        ) : !apiData || apiData.payouts.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <div className="mt-4 space-y-2">
              {apiData.payouts.map((payout, index) => (
                <PayoutCard
                  key={`${payout.txHash}-${index}`}
                  payout={payout}
                  currency={currency}
                  explorerTxUrl={platform ? EXPLORER_TX_URL[platform] : ""}
                />
              ))}
            </div>
            {totalPages > 1 && (
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPrevious={handlePrevious}
                onNext={handleNext}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

function PayoutCard({
  payout,
  currency,
  explorerTxUrl,
}: {
  payout: HaloRafflePayout;
  currency: string;
  explorerTxUrl: string;
}) {
  const { t } = useTranslation();
  const fmt = useFormatters();
  const displayName = payout.winner.username
    ? `@${payout.winner.username}`
    : `${payout.winner.address.slice(0, 8)}...${payout.winner.address.slice(-4)}`;

  return (
    <article className="flex items-center justify-between rounded-[28px] bg-[#F4F4F4] px-5 py-4.5">
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2">
          <p className="text-base font-semibold text-black">
            {fmt.amount(payout.amountInUSDT)} {currency}
          </p>
          <span className="truncate text-xs text-[#666666]">{displayName}</span>
        </div>
        <p className="text-xs text-[#8D8D8D]">{fmt.date(payout.utcDate)}</p>
      </div>
      <a
        href={`${explorerTxUrl}${payout.txHash}`}
        target="_blank"
        rel="noopener noreferrer"
        className="ml-3 shrink-0 rounded-full bg-emerald-500 px-4 py-2 text-xs font-semibold text-white shadow-sm ring-2 ring-emerald-400/50"
        onClick={(e) => e.stopPropagation()}
      >
        {t("View TX")}
      </a>
    </article>
  );
}

function Pagination({
  currentPage,
  totalPages,
  onPrevious,
  onNext,
}: {
  currentPage: number;
  totalPages: number;
  onPrevious: () => void;
  onNext: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="mt-6 flex items-center justify-center gap-4">
      <button
        type="button"
        onClick={onPrevious}
        disabled={currentPage === 1}
        className={`flex size-10 items-center justify-center rounded-full bg-[#F4F4F4] transition hover:bg-[#E5E5E5] ${
          currentPage === 1 ? "cursor-not-allowed opacity-40" : ""
        }`}
        aria-label={t("Previous page")}
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
      <span className="text-sm font-semibold text-black">
        {t("Page {{current}} of {{total}}", {
          current: currentPage,
          total: totalPages,
        })}
      </span>
      <button
        type="button"
        onClick={onNext}
        disabled={currentPage === totalPages}
        className={`flex size-10 items-center justify-center rounded-full bg-[#F4F4F4] transition hover:bg-[#E5E5E5] ${
          currentPage === totalPages ? "cursor-not-allowed opacity-40" : ""
        }`}
        aria-label={t("Next page")}
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
  );
}

function EmptyState() {
  const { t } = useTranslation();

  return (
    <div className="mt-8 flex flex-col items-center justify-center py-12">
      <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-[#F4F4F4]">
        <img src="/u_gift.svg" alt={t("Payouts")} className="h-8 w-8 opacity-40" />
      </div>
      <p className="mb-1.5 text-base font-semibold text-black">
        {t("No payouts yet")}
      </p>
      <p className="mb-6 text-center text-sm text-[#8D8D8D]">
        {t("Verified on-chain payouts will appear here")}
      </p>
    </div>
  );
}

export default Payouts;
