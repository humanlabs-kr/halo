import { useState } from "react";
import { Link, useNavigate } from "react-router";
import PageHeader from "@/components/PageHeader";
import ClaimSuccessModal from "@/components/ClaimSuccessModal";
import ImageQualityCriteriaModal from "@/components/ImageQualityCriteriaModal";
import { sendLightImpactHaptic } from "@/lib/haptic";

import type { ReceiptStatus } from "@halo/contracts";
import type { ReceiptListItem } from "@/lib/api/receipt";
import { usePointStat, useReceipts } from "@/lib/api/queries";
import { usePointClaim, type PointClaim } from "@/hooks/usePointClaim";

import { useTranslation } from "react-i18next";
import { useFormatters } from "@/lib/format";

function History() {
  const listReceiptsQueryResult = useReceipts({ refetchInterval: 5000 });

  const { data: pointStat } = usePointStat({ refetchInterval: 5000 });

  const [showClaimModal, setShowClaimModal] = useState(false);
  const [showQualityCriteriaModal, setShowQualityCriteriaModal] =
    useState(false);
  const claimablePoints = pointStat?.claimablePoint ?? 0;

  const [claimedPoints, setClaimedPoints] = useState(0);

  const { t } = useTranslation();
  const navigate = useNavigate();
  const claim = usePointClaim();

  const onClaimed = (points: number | null) => {
    if (points === null) return;
    setClaimedPoints(points);
    setShowClaimModal(true);
  };

  return (
    <div className="flex min-h-screen flex-col bg-white text-black pb-4">
      <div className="px-5 pt-6">
        <PageHeader
          title={t("L-w4oLUfVM")}
          rightAction={
            <button
              type="button"
              onClick={() => {
                sendLightImpactHaptic();
                navigate("/point-logs");
              }}
              className="flex items-center justify-center size-10 rounded-full bg-linear-to-br from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 transition"
              aria-label={t("View point logs")}
            >
              <svg
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5 text-white"
              >
                <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                <path
                  fillRule="evenodd"
                  d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          }
        />
      </div>

      <div className="flex-1 px-4">
        <ReadyCard
          claimablePoints={claimablePoints}
          claim={claim}
          onClaimed={onClaimed}
        />
        <ResultsToolbar total={listReceiptsQueryResult.data?.totalCount ?? 0} />
        <div className="mt-2.5 space-y-2">
          {listReceiptsQueryResult.isLoading ||
          listReceiptsQueryResult.isPending ? (
            <>
              {Array.from({ length: 4 }).map((_, index) => (
                <ReceiptCellSkeleton key={index} />
              ))}
            </>
          ) : listReceiptsQueryResult.data?.list.length === 0 ? (
            <EmptyState />
          ) : (
            listReceiptsQueryResult.data?.list.map((item) => (
              <ReceiptCell
                key={item.id}
                item={item}
                claim={claim}
                onRejectedClick={() => setShowQualityCriteriaModal(true)}
                onClaimed={onClaimed}
              />
            ))
          )}
        </div>
      </div>
      {showClaimModal && (
        <ClaimSuccessModal
          points={claimedPoints}
          onClose={() => setShowClaimModal(false)}
        />
      )}
      <ImageQualityCriteriaModal
        open={showQualityCriteriaModal}
        onClose={() => setShowQualityCriteriaModal(false)}
      />
    </div>
  );
}

function ReadyCard({
  claimablePoints,
  claim,
  onClaimed,
}: {
  claimablePoints: number;
  claim: PointClaim;
  onClaimed: (points: number | null) => void;
}) {
  const hasClaimable = claimablePoints > 0;
  const { t } = useTranslation();
  const fmt = useFormatters();
  const showClaimAll = claim.mode === "all-at-once" && hasClaimable;

  return (
    <article
      className={`mt-5 pressed flex items-center justify-between rounded-[28px] ${hasClaimable ? "bg-[#E7F3FF]" : "bg-[#F4F4F4]"} px-5 py-4.5`}
    >
      <div>
        <p className="text-base font-semibold text-black">
          {hasClaimable ? t("L-c4LWRT8E") : t("L-BAWBaeXH")}
        </p>
        <p className="text-xs text-[#8D8D8D]">
          {hasClaimable
            ? `${t("{{points}}Pts", { points: fmt.number(claimablePoints) })} ${t("L-wXo3ixjW")}`
            : t("L-k4UKmPmt")}
        </p>
      </div>
      {showClaimAll ? (
        <button
          type="button"
          onClick={() => {
            sendLightImpactHaptic();
            void claim.claimAll().then(onClaimed);
          }}
          disabled={claim.isPending}
          className={`rounded-full bg-black px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-black/90 ${
            claim.isPending ? "cursor-not-allowed opacity-50" : ""
          }`}
        >
          {claim.isPending ? t("L-qHrxRpu3") : t("L-HZTnPZQA")}
        </button>
      ) : (
        <Link
          to="/camera-scan"
          className="rounded-full bg-black px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-black/90"
          onClick={() => sendLightImpactHaptic()}
        >
          {t("L-SwCxEcWY")}
        </Link>
      )}
    </article>
  );
}

function ResultsToolbar({ total }: { total: number }) {
  const { t } = useTranslation();
  return (
    <div className="mt-5.5 flex items-center justify-between px-1.5">
      <p className="text-base font-semibold text-black">
        {total > 0 ? `${total} ${t("L-okTp5EAF")}` : t("L-xo4xTLsK")}
      </p>
      <button
        type="button"
        className="flex items-center gap-1 text-xs font-semibold text-black"
        aria-label={t("Sort by date")}
      >
        <ArrowDownIcon className="h-4 w-4 text-black" />
        {t("L-mBxtTD3C")}
      </button>
    </div>
  );
}

function ReceiptCell({
  item,
  claim,
  onRejectedClick,
  onClaimed,
}: {
  item: ReceiptListItem;
  claim: PointClaim;
  onRejectedClick?: () => void;
  onClaimed: (points: number | null) => void;
}) {
  const { t } = useTranslation();
  const fmt = useFormatters();
  const statusMeta: Record<ReceiptStatus, { label: string }> = {
    pending: { label: t("L-bWVThcgt") },
    rejected: { label: t("L-uHNy0AiD") },
    claimable: { label: t("L-92exz36T") },
    claimed: { label: t("L-CGakdqtO") },
    "rejected-claimed": { label: t("L-uHNy0AiD") },
  };

  // Where the whole balance is claimed at once, the per-receipt button would
  // be a second way to trigger the same call — the list is read-only there.
  const isClaimable =
    claim.mode === "per-receipt" &&
    (item.status === "claimable" || item.status === "rejected");

  const onClaim = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (claim.isPending) return;

    sendLightImpactHaptic();
    void claim.claimReceipt(item.id).then(onClaimed);
  };
  const meta = statusMeta[item.status];

  const handleClick = () => {
    sendLightImpactHaptic();
  };

  if (item.status === "pending") {
    return (
      <article className="pressed flex items-center justify-between rounded-[28px] bg-[#F4F4F4] px-5 py-4.5">
        <div>
          <p className="text-base font-semibold text-black">{meta.label}</p>
          <p className="text-xs text-[#6C6C6C]">
            {fmt.relative(item.createdAt)}
          </p>
        </div>
        <img
          src="/fi_clock.svg"
          alt={t("Clock")}
          className="h-6 w-6 text-[#585858]"
        />
      </article>
    );
  }

  if (item.status === "rejected" || item.status === "rejected-claimed") {
    return (
      <article
        className="pressed flex items-center justify-between rounded-[28px] bg-[#F4F4F4] px-5 py-4.5 cursor-pointer"
        onClick={() => {
          sendLightImpactHaptic();
          onRejectedClick?.();
        }}
      >
        <div className="flex items-center gap-3.5">
          <ScoreBadge score={0} />
          <div>
            <p className="text-base font-semibold text-black">{meta.label}</p>
            <p className="text-xs text-[#6C6C6C]">
              {fmt.relative(item.createdAt)}
            </p>
          </div>
        </div>
        {isClaimable ? (
          <button
            type="button"
            onClick={onClaim}
            className={`rounded-full bg-black px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-black/90 ${
              claim.isPending ? "opacity-50 cursor-not-allowed" : ""
            }`}
            disabled={claim.isPending}
          >
            {claim.isPending ? t("L-qHrxRpu3") : t("L-HZTnPZQA")}
          </button>
        ) : (
          <p className="text-base font-semibold text-black">
            {t("{{points}}Pt", { points: fmt.number(item.assignedPoint) })}
          </p>
        )}
      </article>
    );
  }

  return (
    <Link to={`/history/${item.id}`} onClick={handleClick} className="block">
      <article className="pressed flex items-center justify-between rounded-[28px] bg-[#F4F4F4] px-5 py-4.5">
        <div className="flex items-center gap-3.5">
          <ScoreBadge score={item.qualityRate} />
          <div className="space-y-1">
            <p className="text-base font-semibold text-black">
              {item.merchantName}{" "}
              <span className="text-xs font-normal text-[#6C6C6C]">
                ({item.currency}{" "}
                {item.totalAmount != null
                  ? fmt.number(Number(item.totalAmount), {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 2,
                    })
                  : "—"}
                )
              </span>
            </p>
            <p className="text-xs text-[#6C6C6C]">
              <span>{meta.label}</span>
              <span> · </span>
              <span>{fmt.relative(item.createdAt)}</span>
            </p>
          </div>
        </div>
        {isClaimable ? (
          <button
            type="button"
            onClick={onClaim}
            className={`rounded-full bg-black px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-black/90 ${
              claim.isPending ? "opacity-50 cursor-not-allowed" : ""
            }`}
            disabled={claim.isPending}
          >
            {claim.isPending ? t("L-qHrxRpu3") : t("L-HZTnPZQA")}
          </button>
        ) : (
          <p className="text-base font-semibold text-black">
            {t("{{points}}Pt", { points: fmt.number(item.assignedPoint || 0) })}
          </p>
        )}
      </article>
    </Link>
  );
}

/**
 * `qualityRate` is null until the analysis queue has scored the receipt. A
 * pending scan therefore shows an empty grey ring — rendering it as 0 would
 * read as "scored zero", which is a different and much worse thing to say.
 */
function ScoreBadge({ score }: { score: number | null }) {
  const clamped = score === null ? 0 : Math.min(Math.max(score, 0), 100);
  const tone = score === null ? "#C7C7C7" : getScoreColor(clamped);
  return (
    <div className="relative flex size-[46px] max-w-[46px] min-w-[46px] items-center justify-center rounded-full bg-white shadow-[0_2px_6px_rgba(15,23,42,0.08)]">
      <svg viewBox="0 0 40 40" className="absolute inset-0">
        <circle
          cx="20"
          cy="20"
          r="16"
          stroke="#E5E7EB"
          strokeWidth="4"
          fill="none"
        />
        <circle
          cx="20"
          cy="20"
          r="16"
          stroke={tone}
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={2 * Math.PI * 16}
          strokeDashoffset={(1 - clamped / 100) * 2 * Math.PI * 16}
          transform="rotate(-90 20 20)"
        />
      </svg>
      <span className="text-sm font-bold" style={{ color: tone }}>
        {score === null ? "–" : clamped}
      </span>
    </div>
  );
}

function getScoreColor(score: number) {
  if (score < 40) return "#F9706A";
  if (score < 70) return "#F5B10A";
  return "#4BCD10";
}

function EmptyState() {
  const { t } = useTranslation();
  return (
    <div className="mt-8 flex flex-col items-center justify-center py-12">
      <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-[#F4F4F4]">
        <img
          src="/u_receipt.svg"
          alt={t("Receipt")}
          className="h-8 w-8 opacity-40"
        />
      </div>
      <p className="mb-1.5 text-base font-semibold text-black">
        {t("L-cUHsntJ0")}
      </p>
      <p className="mb-6 text-center text-sm text-[#8D8D8D]">
        {t("L-ObU3qjPk")}
      </p>
      <Link
        to="/camera-scan"
        className="rounded-full bg-black px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-black/90"
        onClick={() => sendLightImpactHaptic()}
      >
        {t("L-9ngoRkB0")}
      </Link>
    </div>
  );
}

function ReceiptCellSkeleton() {
  return (
    <article className="flex items-center justify-between rounded-[28px] bg-[#F4F4F4] px-5 py-4.5">
      <div className="flex items-center gap-3.5">
        <div className="size-[46px] animate-pulse rounded-full bg-gray-300" />
        <div className="space-y-1">
          <div className="h-4 w-32 animate-pulse rounded bg-gray-300" />
          <div className="h-3 w-24 animate-pulse rounded bg-gray-300" />
        </div>
      </div>
      <div className="h-4 w-12 animate-pulse rounded bg-gray-300" />
    </article>
  );
}

function ArrowDownIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M10 5v10" />
      <path d="m6 11 4 4 4-4" />
    </svg>
  );
}

export default History;
