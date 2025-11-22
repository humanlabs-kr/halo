import { useState } from "react";
import { Link } from "react-router";
import PageHeader from "../components/PageHeader";
import ClaimSuccessModal from "../components/ClaimSuccessModal";
import {
  sendLightImpactHaptic,
  sendSuccessNotificationHaptic,
} from "../components/hapticFeedback";
import {
  GetListReceipts200ListItem,
  GetListReceipts200ListItemStatus,
  useGetListReceipts,
} from "@/lib/generated/react-query";

import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

const statusMeta: Record<GetListReceipts200ListItemStatus, { label: string }> =
  {
    pending: { label: "Processing" },
    rejected: { label: "Rejected" },
    claimable: { label: "Claimable" },
    claimed: { label: "Claimed" },
  };

function History() {
  const listReceiptsQueryResult = useGetListReceipts({
    query: {
      refetchInterval: 3000,
    },
  });

  // TODO: 클레임 포인트 API 연동 전 임시 코드
  const [showClaimModal, setShowClaimModal] = useState(false);
  const claimablePoints = 0;
  // useMemo(
  //   () =>
  //     receipts.reduce((sum, item) => {
  //       if (item.status === "claimable" && typeof item.points === "number") {
  //         return sum + item.points;
  //       }
  //       return sum;
  //     }, 0),
  //   [receipts]
  // );

  return (
    <div className="flex h-full flex-col bg-white text-black pb-4">
      <div className="px-5 pt-6">
        <PageHeader title="History" />
      </div>

      <div className="flex-1 px-4">
        <ReadyCard
          claimablePoints={claimablePoints}
          onClaim={() => setShowClaimModal(true)}
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
          ) : (
            listReceiptsQueryResult.data?.list.map((item) => (
              <ReceiptCell key={item.id} item={item} />
            ))
          )}
        </div>
      </div>
      {showClaimModal && (
        <ClaimSuccessModal
          points={claimablePoints}
          onClose={() => setShowClaimModal(false)}
        />
      )}
    </div>
  );
}

function ReadyCard({
  claimablePoints,
  onClaim,
}: {
  claimablePoints: number;
  onClaim: () => void;
}) {
  const hasClaimable = claimablePoints > 0;
  return (
    <article
      className={`mt-5 pressed flex items-center justify-between rounded-[28px] ${hasClaimable ? "bg-[#E7F3FF]" : "bg-[#F4F4F4]"} px-5 py-4.5`}
    >
      <div>
        <p className="text-base font-semibold text-black">
          {hasClaimable ? "Rewards ready to claim" : "Ready to scan?"}
        </p>
        <p className="text-xs text-[#8D8D8D]">
          {hasClaimable
            ? `${claimablePoints}Pts available`
            : "Upload a receipt and earn rewards"}
        </p>
      </div>
      {hasClaimable ? (
        <button
          type="button"
          className="rounded-full bg-black px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-black/90"
          onClick={() => {
            sendSuccessNotificationHaptic();
            onClaim();
          }}
        >
          Claim
        </button>
      ) : (
        <Link
          to="/camera-scan"
          className="rounded-full bg-black px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-black/90"
          onClick={() => sendLightImpactHaptic()}
        >
          SCAN
        </Link>
      )}
    </article>
  );
}

function ResultsToolbar({ total }: { total: number }) {
  return (
    <div className="mt-5.5 flex items-center justify-between px-1.5">
      <p className="text-base font-semibold text-black">{total} Results</p>
      <button
        type="button"
        className="flex items-center gap-1 text-xs font-semibold text-black"
        aria-label="Sort by date"
      >
        <ArrowDownIcon className="h-4 w-4 text-black" />
        Date
      </button>
    </div>
  );
}

function ReceiptCell({ item }: { item: GetListReceipts200ListItem }) {
  const meta = statusMeta[item.status];
  if (item.status === "pending") {
    return (
      <article className="pressed flex items-center justify-between rounded-[28px] bg-[#F4F4F4] px-5 py-4.5">
        <div>
          <p className="text-base font-semibold text-black">{meta.label}</p>
          <p className="text-xs text-[#6C6C6C]">
            {dayjs(item.createdAt).fromNow()}
          </p>
        </div>
        <img
          src="/fi_clock.svg"
          alt="Clock"
          className="h-6 w-6 text-[#585858]"
        />
      </article>
    );
  }

  if (item.status === "rejected") {
    return (
      <article className="pressed flex items-center justify-between rounded-[28px] bg-[#F4F4F4] px-5 py-4.5">
        <div className="flex items-center gap-3.5">
          <ScoreBadge score={0} />
          <div>
            <p className="text-base font-semibold text-black">{meta.label}</p>
            <p className="text-xs text-[#6C6C6C]">
              {dayjs(item.createdAt).fromNow()}
            </p>
          </div>
        </div>
        <p className="text-base font-semibold text-black">0Pt</p>
      </article>
    );
  }

  return (
    <article className="pressed flex items-center justify-between rounded-[28px] bg-[#F4F4F4] px-5 py-4.5">
      <div className="flex items-center gap-3.5">
        <ScoreBadge score={item.qualityRate} />
        <div className="space-y-1">
          <p className="text-base font-semibold text-black">
            {item.merchantName}
          </p>
          <p className="text-xs text-[#6C6C6C]">
            <span>{meta.label}</span>
            <span> · </span>
            <span>{dayjs(item.createdAt).fromNow()}</span>
          </p>
        </div>
      </div>
      <p className="text-base font-semibold text-black">
        {item.assignedPoint || 0}Pt
      </p>
    </article>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const clamped = Math.min(Math.max(score, 0), 100);
  const tone = getScoreColor(clamped);
  return (
    <div className="relative flex size-[46px] items-center justify-center rounded-full bg-white shadow-[0_2px_6px_rgba(15,23,42,0.08)]">
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
        {clamped}
      </span>
    </div>
  );
}

function getScoreColor(score: number) {
  if (score < 40) return "#F9706A";
  if (score < 70) return "#F5B10A";
  return "#4BCD10";
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
