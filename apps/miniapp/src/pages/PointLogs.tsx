import { useState } from "react";
import { useNavigate } from "react-router";
import { sendLightImpactHaptic } from "@/lib/haptic";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import type { PointLog, PointLogSourceType } from "@/lib/api/point";
import { usePointLogs } from "@/lib/api/queries";

dayjs.extend(relativeTime);
dayjs.locale("en");

function PointLogs() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const limit = 20;

  const {
    data: apiData,
    isLoading,
    error,
    isFetching,
    refetch,
  } = usePointLogs({ limit, offset: (page - 1) * limit });

  const handleRefresh = () => {
    sendLightImpactHaptic();
    refetch();
  };

  const totalPages = apiData ? Math.ceil(apiData.totalCount / limit) : 0;

  const handlePrevious = () => {
    if (page > 1) {
      sendLightImpactHaptic();
      setPage((prev) => prev - 1);
      window.scrollTo(0, 0);
    }
  };

  const handleNext = () => {
    if (page < totalPages) {
      sendLightImpactHaptic();
      setPage((prev) => prev + 1);
      window.scrollTo(0, 0);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-white text-black">
      <div className="px-5 pt-6">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                sendLightImpactHaptic();
                navigate(-1);
              }}
              className="flex items-center justify-center size-10 rounded-full bg-[#F4F4F4] hover:bg-[#E5E5E5] transition"
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
            <h1 className="text-2xl font-bold">{t("L-zLWwptzn")}</h1>
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isFetching}
            className={`flex items-center justify-center size-10 rounded-full bg-[#F4F4F4] hover:bg-[#E5E5E5] transition ${
              isFetching ? "opacity-50" : ""
            }`}
            aria-label="Refresh"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`h-5 w-5 text-black ${isFetching ? "animate-spin" : ""}`}
            >
              <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
              <path d="M21 3v5h-5" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex-1 px-4 pb-4 overflow-y-auto">
        {isLoading || isFetching ? (
          <div className="mt-8 flex flex-col items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#F4F4F4] border-t-black" />
            <p className="mt-4 text-sm text-[#8D8D8D]">{t("L-W9Q0CklX")}</p>
          </div>
        ) : error ? (
          <div className="mt-8 flex flex-col items-center justify-center py-12">
            <p className="mb-1.5 text-base font-semibold text-black">
              Error loading point logs
            </p>
            <p className="mb-6 text-center text-sm text-[#8D8D8D]">
              Please try again later
            </p>
          </div>
        ) : !apiData || apiData.list.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <div className="mt-4 space-y-2">
              {apiData.list.map((log) => (
                <PointLogCell key={log.id} log={log} />
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

function PointLogCell({ log }: { log: PointLog }) {
  const { t } = useTranslation();
  const isPositive = log.diff > 0;

  const sourceTypeLabels: Record<PointLogSourceType, string> = {
    airdrop: t("L-60sEhS90"),
    "receipt-upload": t("L-SmZlO3bs"),
    raffle: t("L-EbJnZmoR"),
    manual: t("L-dPqbUD7r"),
    "daily-claim": t("L-hLxj0K2z"),
    "daily-claim-onchain": t("L-hLxj0K2z"),
  };

  return (
    <article className="pressed flex items-center justify-between rounded-[28px] bg-[#F4F4F4] px-5 py-4.5">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p
            className={`text-base font-semibold ${
              isPositive ? "text-[#4BCD10]" : "text-[#F9706A]"
            }`}
          >
            {isPositive ? "+" : ""}
            {log.diff.toLocaleString()}Pt
          </p>
          <span className="text-xs text-[#8D8D8D]">
            {sourceTypeLabels[log.sourceType]}
          </span>
        </div>
        <p className="text-xs text-[#6C6C6C]">
          {dayjs(log.createdAt).fromNow()}
        </p>
      </div>
      <div className="text-right ml-4">
        <p className="text-sm font-semibold text-black">
          {log.afterBalance.toLocaleString()}Pt
        </p>
        <p className="text-xs text-[#8D8D8D]">{t("L-UUfOZ5zC")}</p>
      </div>
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
  return (
    <div className="mt-6 flex items-center justify-center gap-4">
      <button
        type="button"
        onClick={onPrevious}
        disabled={currentPage === 1}
        className={`flex items-center justify-center size-10 rounded-full bg-[#F4F4F4] hover:bg-[#E5E5E5] transition ${
          currentPage === 1 ? "opacity-40 cursor-not-allowed" : ""
        }`}
        aria-label="Previous page"
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
        Page {currentPage} of {totalPages}
      </span>
      <button
        type="button"
        onClick={onNext}
        disabled={currentPage === totalPages}
        className={`flex items-center justify-center size-10 rounded-full bg-[#F4F4F4] hover:bg-[#E5E5E5] transition ${
          currentPage === totalPages ? "opacity-40 cursor-not-allowed" : ""
        }`}
        aria-label="Next page"
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
        <img
          src="/u_receipt.svg"
          alt="Point Logs"
          className="h-8 w-8 opacity-40"
        />
      </div>
      <p className="mb-1.5 text-base font-semibold text-black">
        {t("L-qlWCELZD")}
      </p>
      <p className="mb-6 text-center text-sm text-[#8D8D8D]">
        {t("L-vIITs9Sk")}
      </p>
    </div>
  );
}

export default PointLogs;
