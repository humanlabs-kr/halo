import { useParams, useNavigate } from "react-router";
import type { ReceiptStatus } from "@halo/contracts";
import { receiptApi } from "@/lib/api/receipt";
import { useReceipt } from "@/lib/api/queries";
import PageHeader from "@/components/PageHeader";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";

function HistoryDetail() {
  const { t } = useTranslation();
  const { receiptId } = useParams<{ receiptId: string }>();
  const navigate = useNavigate();

  // Keyed by the shared `ReceiptStatus`, so all five states the server can
  // return have copy. The previous map covered three, and a receipt that was
  // still `pending` — or a rejected one already paid out — rendered as a
  // crash on `undefined.label`.
  const statusMeta: Record<ReceiptStatus, { label: string }> = {
    pending: { label: t("L-bWVThcgt") },
    rejected: { label: t("L-uHNy0AiD") },
    claimable: { label: t("L-92exz36T") },
    claimed: { label: t("L-CGakdqtO") },
    "rejected-claimed": { label: t("L-uHNy0AiD") },
  };
  const {
    data: receipt,
    isLoading,
    isError,
  } = useReceipt(receiptId);

  if (!receiptId) {
    return (
      <div className="flex h-full flex-col bg-white text-black">
        <div className="px-5 pt-6">
          <PageHeader title="Receipt Detail" />
        </div>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-base text-[#8D8D8D]">{t("L-rFZZlscX")}</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white text-black z-50">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="h-10 w-10 rounded-full border-2 border-[#E5E5E5] border-t-black animate-spin" />
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
          <p className="text-base text-[#8D8D8D]">{t("L-QWL2riST")}</p>
        </div>
      </div>
    );
  }

  const meta = statusMeta[receipt.status];

  return (
    <div className="flex h-full flex-col bg-white text-black pb-4">
      <div className="px-5 pt-6">
        <div className="flex items-center gap-3 mb-1">
          <button
            type="button"
            onClick={() => {
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
            <div className="mt-4 mb-3">
              <div className="relative w-full rounded-[28px] overflow-hidden bg-[#F4F4F4]">
                <img
                  src={receiptApi.imageUrl(receipt.id, receipt.images[0]!.id)}
                  alt="Receipt"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          ) : (
            // Multiple images: snappable carousel
            <div className="mt-4 mb-3">
              <h3 className="text-base font-semibold text-black mb-3">
                {t("L-Cw8fuIAA")} ({receipt.images.length})
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
                        src={receiptApi.imageUrl(receipt.id, image.id)}
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
          // A receipt with no stored image: show the frame rather than
          // pulling a stand-in picture from a third-party host.
          <div className="mt-4 mb-6">
            <div className="relative flex aspect-3/4 w-full items-center justify-center overflow-hidden rounded-[28px] bg-[#F4F4F4]">
              <img src="/u_receipt.svg" alt="" className="h-12 w-12 opacity-30" />
            </div>
          </div>
        )}

        {/* Main Info Card */}
        <article className="rounded-[28px] bg-[#F4F4F4] px-5 py-4.5 mb-3">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2 -ml-1">
                <span
                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                    receipt.status === "rejected"
                      ? "bg-rose-100/80 text-rose-500/80"
                      : receipt.status === "claimed"
                        ? "bg-green-100 text-green-500"
                        : receipt.status === "claimable"
                          ? "bg-blue-100 text-blue-500"
                          : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {meta.label}
                </span>
              </div>
              <h2 className="text-lg font-bold text-black">
                {receipt.merchantName}
              </h2>
            </div>
            <ScoreBadge score={receipt.qualityRate} />
          </div>

          {receipt.totalAmount != null && (
            <div className="pt-4 border-t border-[#E5E5E5]">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-black">
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
        <article className="rounded-[28px] bg-card-background px-5 py-4.5 mb-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#666666] mb-1">
                {t("L-G9hXzMVF")}
              </p>
              <p className="text-xl font-bold text-black">
                {receipt.assignedPoint || 0} Pts
              </p>
            </div>
            <div className="flex items-center justify-center size-12 rounded-full bg-white">
              <img src="/u_gift.svg" alt="Points" className="h-6 w-6" />
            </div>
          </div>
        </article>

        {/* Details Card */}
        <article className="rounded-[28px] bg-[#F4F4F4] px-5 py-4.5 mb-3">
          <h3 className="text-base font-semibold text-black mb-4">
            {t("L-J4luoccb")}
          </h3>
          <div className="space-y-3">
            {receipt.issuedAt && (
              <DetailRow
                label={t("L-hCsmUods")}
                value={dayjs(receipt.issuedAt).format("MMMM D, YYYY h:mm A")}
              />
            )}
            {/* {receipt.paymentMethod && (
              <DetailRow label="Payment Method" value={receipt.paymentMethod} />
            )} */}
            {receipt.countryCode && (
              <DetailRow label={t("L-wFFZqro3")} value={receipt.countryCode} />
            )}
            <DetailRow
              label={t("L-pSOJ71RM")}
              value={dayjs(receipt.createdAt).format("MMMM D, YYYY h:mm A")}
            />
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

/**
 * `qualityRate` is null until the analysis queue has scored the receipt. A
 * pending scan therefore shows an empty grey ring — rendering it as 0 would
 * read as "scored zero", which is a different and much worse thing to say.
 */
function ScoreBadge({ score }: { score: number | null }) {
  const clamped = score === null ? 0 : Math.min(Math.max(score, 0), 100);
  const tone = score === null ? "#C7C7C7" : getScoreColor(clamped);
  return (
    <div className="relative flex size-[52px] items-center justify-center rounded-full bg-white shadow-[0_2px_6px_rgba(15,23,42,0.08)]">
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

export default HistoryDetail;
