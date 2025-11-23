import { useParams, useNavigate } from "react-router";
import {
  useGetReceiptById,
  GetReceiptById200Status,
  GetReceiptById200ImagesItem,
} from "@/lib/generated/react-query";
import PageHeader from "../components/PageHeader";
import dayjs from "dayjs";
import { sendLightImpactHaptic } from "../components/hapticFeedback";

/**
 * Get the image URL for a receipt image.
 * TODO: Replace with actual image URL construction when available.
 * The image object contains synapsePieceCid which can be used to construct the URL.
 */
function getReceiptImageUrl(
  receiptId: string,
  image: GetReceiptById200ImagesItem
): string {
  return `${import.meta.env.VITE_API_URL}/v1/receipts/${receiptId}/image/${image.id}`;
}

const statusMeta: Record<GetReceiptById200Status, { label: string }> = {
  rejected: { label: "Rejected" },
  claimable: { label: "Claimable" },
  claimed: { label: "Claimed" },
};

function HistoryDetail() {
  const { receiptId } = useParams<{ receiptId: string }>();
  const navigate = useNavigate();

  const {
    data: receipt,
    isLoading,
    isError,
  } = useGetReceiptById(receiptId || "", {
    query: {
      enabled: !!receiptId,
    },
  });

  if (!receiptId) {
    return (
      <div className="flex h-full flex-col bg-white text-black">
        <div className="px-5 pt-6">
          <PageHeader title="Receipt Detail" />
        </div>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-base text-[#8D8D8D]">Receipt ID not found</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-full flex-col bg-white text-black">
        <div className="flex-1 px-4">
          <ReceiptDetailSkeleton />
        </div>
      </div>
    );
  }

  if (isError || !receipt) {
    return (
      <div className="flex h-full flex-col bg-white text-black">
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
        <div className="flex-1 flex items-center justify-center">
          <p className="text-base text-[#8D8D8D]">
            Failed to load receipt details
          </p>
        </div>
      </div>
    );
  }

  const meta = statusMeta[receipt.status];

  return (
    <div className="flex h-full flex-col bg-white text-black pb-4">
      <div className="px-5 pt-6">
        <div className="flex items-center gap-3 mb-4">
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
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4">
        {/* Receipt Images Gallery */}
        {receipt.images && receipt.images.length > 0 ? (
          receipt.images.length === 1 ? (
            // Single image: full width
            <div className="mt-4 mb-6">
              <div className="relative w-full rounded-[28px] overflow-hidden bg-[#F4F4F4] aspect-3/4">
                <img
                  src={getReceiptImageUrl(receipt.id, receipt.images[0])}
                  alt="Receipt"
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
          ) : (
            // Multiple images: snappable carousel
            <div className="mt-4 mb-6">
              <h3 className="text-base font-semibold text-black mb-3">
                Receipt Images ({receipt.images.length})
              </h3>
              <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory">
                {receipt.images
                  .sort((a, b) => a.numOrder - b.numOrder)
                  .map((image, index) => (
                    <div
                      key={image.id}
                      className="shrink-0 w-[85vw] max-w-sm rounded-[28px] overflow-hidden bg-[#F4F4F4] aspect-3/4 snap-center"
                    >
                      <img
                        src={getReceiptImageUrl(receipt.id, image)}
                        alt={`Receipt image ${index + 1}`}
                        className="w-full h-full object-contain"
                      />
                    </div>
                  ))}
              </div>
              <div className="flex justify-center gap-1.5 mt-3">
                {receipt.images.map((_, index) => (
                  <div
                    key={index}
                    className="h-1.5 w-1.5 rounded-full bg-[#D1D1D1]"
                  />
                ))}
              </div>
            </div>
          )
        ) : (
          <div className="mt-4 mb-6">
            <div className="relative w-full rounded-[28px] overflow-hidden bg-[#F4F4F4] aspect-3/4">
              <img
                src="https://via.placeholder.com/400x600/CCCCCC/666666?text=Receipt+Image"
                alt="Receipt"
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        )}

        {/* Main Info Card */}
        <article className="rounded-[28px] bg-[#F4F4F4] px-5 py-4.5 mb-4">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h2 className="text-xl font-bold text-black mb-1">
                {receipt.merchantName}
              </h2>
              <div className="flex items-center gap-2 mb-2">
                <span
                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                    receipt.status === "rejected"
                      ? "bg-red-100 text-red-700"
                      : receipt.status === "claimed"
                        ? "bg-green-100 text-green-700"
                        : receipt.status === "claimable"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {meta.label}
                </span>
              </div>
            </div>
            <ScoreBadge score={receipt.qualityRate} />
          </div>

          {receipt.totalAmount != null && (
            <div className="pt-4 border-t border-[#E5E5E5]">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-black">
                  {receipt.currency}{" "}
                  {Number(receipt.totalAmount).toLocaleString("en-US", {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>
          )}
        </article>

        {/* Points Card */}
        <article className="rounded-[28px] bg-[#E7F3FF] px-5 py-4.5 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#666666] mb-1">
                Assigned Points
              </p>
              <p className="text-2xl font-bold text-black">
                {receipt.assignedPoint || 0} Pts
              </p>
            </div>
            <div className="flex items-center justify-center size-12 rounded-full bg-white">
              <img src="/u_gift.svg" alt="Points" className="h-6 w-6" />
            </div>
          </div>
        </article>

        {/* Details Card */}
        <article className="rounded-[28px] bg-[#F4F4F4] px-5 py-4.5 mb-4">
          <h3 className="text-base font-semibold text-black mb-4">
            Receipt Details
          </h3>
          <div className="space-y-3">
            {receipt.issuedAt && (
              <DetailRow
                label="Issued Date"
                value={dayjs(receipt.issuedAt).format("MMMM D, YYYY h:mm A")}
              />
            )}
            {/* {receipt.paymentMethod && (
              <DetailRow label="Payment Method" value={receipt.paymentMethod} />
            )} */}
            {receipt.countryCode && (
              <DetailRow label="Country" value={receipt.countryCode} />
            )}
            <DetailRow
              label="Uploaded"
              value={dayjs(receipt.createdAt).format("MMMM D, YYYY h:mm A")}
            />
            {/* <DetailRow
              label="Quality Score"
              value={`${receipt.qualityRate}/100`}
            /> */}
          </div>
        </article>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-[#E5E5E5] last:border-0">
      <span className="text-sm text-[#666666]">{label}</span>
      <span className="text-sm font-medium text-black text-right">{value}</span>
    </div>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const clamped = Math.min(Math.max(score, 0), 100);
  const tone = getScoreColor(clamped);
  return (
    <div className="relative flex size-[60px] items-center justify-center rounded-full bg-white shadow-[0_2px_6px_rgba(15,23,42,0.08)]">
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
      <span className="text-base font-bold" style={{ color: tone }}>
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

function ReceiptDetailSkeleton() {
  return (
    <div className="mt-4 space-y-4">
      <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className="shrink-0 w-[85vw] max-w-sm rounded-[28px] bg-gray-200 aspect-3/4 animate-pulse"
          />
        ))}
      </div>
      <div className="rounded-[28px] bg-[#F4F4F4] px-5 py-4.5">
        <div className="h-6 w-32 bg-gray-300 rounded animate-pulse mb-2" />
        <div className="h-4 w-24 bg-gray-300 rounded animate-pulse" />
      </div>
      <div className="rounded-[28px] bg-[#F4F4F4] px-5 py-4.5">
        <div className="h-4 w-40 bg-gray-300 rounded animate-pulse mb-3" />
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-3 bg-gray-300 rounded animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default HistoryDetail;
