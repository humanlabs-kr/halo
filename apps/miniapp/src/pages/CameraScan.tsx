import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { Drawer } from "vaul";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { useCameraStream } from "@/hooks/useCameraStream";
import ScanPendingModal from "@/components/ScanPendingModal";
import { ApiRequestError } from "@/lib/api/client";
import { receiptApi } from "@/lib/api/receipt";
import { useQueryClient } from "@tanstack/react-query";
import { receiptsQueryKey, useReceiptStat } from "@/lib/api/queries";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@/stores/auth";
import BlacklistModal from "@/components/BlacklistModal";
import { SCAN_LIMIT } from "@/lib/constants";
import { TURNSTILE_SITE_KEY } from "@/lib/env";
import { sendLightImpactHaptic } from "@/lib/haptic";

// One dot per scan allowed today.
const TOTAL_STEPS = SCAN_LIMIT.daily;

function CameraScan() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { videoRef, state, errorMessage, retry } = useCameraStream();
  const [showPopup, setShowPopup] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileInstance>(null);

  const queryClient = useQueryClient();

  const handleCapture = () => {
    if (state !== "ready" || isReviewing || !turnstileToken) return;
    if (!videoRef.current || videoRef.current.readyState < 2) return;

    if (isScanLimitReached) {
      toast.error(t("L-xl7MA3jN"));
      return;
    }

    sendLightImpactHaptic();
    setIsReviewing(true);

    void (async () => {
      if (videoRef.current) {
        videoRef.current.pause();
      }
      // Take a snapshot from the video and create a File object ("receipt.jpg")
      const canvas = document.createElement("canvas");
      const video = videoRef.current!;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      // Convert canvas to blob and create a File
      const getFile = () =>
        new Promise<File>((resolve, reject) => {
          canvas.toBlob((blob) => {
            if (blob) {
              resolve(new File([blob], "receipt.jpg", { type: "image/jpeg" }));
            } else {
              reject(new Error("Failed to capture image"));
            }
          }, "image/jpeg");
        });

      const file = await getFile();

      try {
        await receiptApi.upload({ file, turnstileToken: turnstileToken! });
      } catch (error) {
        setIsReviewing(false);
        setTurnstileToken(null);
        turnstileRef.current?.reset();
        if (videoRef.current?.paused) {
          videoRef.current.play().catch(() => {});
        }
        // The upload failures worth naming (daily limit, blacklist, CAPTCHA)
        // already arrive as readable copy; anything else gets the generic line.
        toast.error(
          error instanceof ApiRequestError ? error.message : t("L-xl7MA3jN"),
        );
        return;
      }

      queryClient.invalidateQueries({ queryKey: receiptsQueryKey() });
      setIsReviewing(false);
      setShowPopup(true);
      setTurnstileToken(null);
      turnstileRef.current?.reset();
    })();
  };

  const handleModalClose = () => {
    setShowPopup(false);
    // Resuming can be refused (backgrounded tab, autoplay policy); the user
    // can always retake, so there is nothing to recover here.
    if (videoRef.current?.paused) {
      void videoRef.current.play().catch(() => {});
    }
  };

  const isBlacklisted = useAuthStore((s) => s.isBlacklisted);

  const { data: receiptStat } = useReceiptStat();
  const dailyScanCount = receiptStat?.dailyScanCount ?? 0;
  const weeklyScanCount = receiptStat?.weeklyScanCount ?? 0;
  const isScanLimitReached =
    dailyScanCount >= SCAN_LIMIT.daily || weeklyScanCount >= SCAN_LIMIT.weekly;
  const steps = useMemo(
    () =>
      Array.from({ length: TOTAL_STEPS }, (_, index) => {
        const completedCount = Math.min(dailyScanCount, TOTAL_STEPS);
        return index < completedCount;
      }),
    [dailyScanCount],
  );

  return (
    <div className="flex min-h-screen justify-center bg-black text-white">
      <div className="relative flex min-h-screen w-full flex-col px-4 pt-4 pb-12">
        <ScannerFrame videoRef={videoRef} state={state} />

        <div className="relative z-10 flex flex-1 flex-col">
          <Header onClose={() => navigate(-1)} />
          <StepIndicator steps={steps} />
        </div>

        {isReviewing && <ReviewOverlay />}

        <div className="fixed right-3 bottom-3 z-20 scale-75 origin-bottom-right opacity-80">
          <Turnstile
            ref={turnstileRef}
            siteKey={TURNSTILE_SITE_KEY}
            onSuccess={setTurnstileToken}
            onExpire={() => setTurnstileToken(null)}
            onError={() => setTurnstileToken(null)}
            options={{ theme: "dark", size: "compact" }}
          />
        </div>

        <CaptureButton
          disabled={state !== "ready" || isReviewing || !turnstileToken || isScanLimitReached || isBlacklisted}
          onCapture={handleCapture}
        />

        <StatusText state={state} errorMessage={errorMessage} onRetry={retry} />
        {showPopup && (
          <ScanPendingModal
            onClose={handleModalClose}
            onHistory={() => {
              handleModalClose();
              navigate("/history");
            }}
            onScanMore={handleModalClose}
          />
        )}
        {isBlacklisted && <BlacklistModal />}
      </div>
    </div>
  );
}

function Header({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  return (
    <header className="flex items-center justify-between text-white">
      <button type="button" onClick={onClose} aria-label={t("Close")}>
        <img src="/u_multiply.svg" alt="Close" className="h-6 w-6" />
      </button>
      <div className="text-base font-semibold">{t("L-PQElQnFz")}</div>
      <InfoDrawer />
    </header>
  );
}

function StepIndicator({ steps }: { steps: boolean[] }) {
  const { t } = useTranslation();

  return (
    <div className="mt-4 flex justify-center gap-3">
      {steps.map((completed, index) => (
        <span
          key={`scan-step-${index}`}
          className={[
            "flex h-6 w-6 items-center justify-center rounded-full border border-dashed",
            completed
              ? "border-transparent bg-success text-black"
              : "border-white/40 text-white/70",
          ].join(" ")}
        >
          {completed ? (
            <img src="/fi_check.svg" alt={t("Completed")} className="h-3.5 w-3.5" />
          ) : (
            ""
          )}
        </span>
      ))}
    </div>
  );
}

type ScannerFrameProps = {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  state: "idle" | "loading" | "ready" | "error";
};

function ScannerFrame({ videoRef, state }: ScannerFrameProps) {
  return (
    <div className="pointer-events-none absolute inset-0">
      <video
        ref={videoRef}
        className={[
          "h-full w-full object-cover",
          state === "ready" ? "opacity-100" : "opacity-0",
        ].join(" ")}
        playsInline
        muted
        autoPlay
      />

      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative h-[520px] w-[320px] max-w-[80vw]">
          <CornerImage className="left-0 top-0" />
          <CornerImage className="right-0 top-0 rotate-90" />
          <CornerImage className="left-0 bottom-0 -rotate-90" />
          <CornerImage className="right-0 bottom-0 rotate-180" />
        </div>
      </div>
    </div>
  );
}

function CornerImage({ className }: { className: string }) {
  return (
    <img
      src="/corner.png"
      alt=""
      className={[
        "pointer-events-none absolute h-14 w-14 opacity-80",
        className,
      ].join(" ")}
    />
  );
}

function CaptureButton({
  disabled,
  onCapture,
}: {
  disabled: boolean;
  onCapture: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="pointer-events-none fixed bottom-10 left-1/2 z-20 -translate-x-1/2">
      <button
        type="button"
        className="pointer-events-auto flex h-16 w-16 items-center justify-center rounded-full border-2 border-white bg-white/10 disabled:opacity-40"
        aria-label={t("Capture")}
        disabled={disabled}
        onClick={() => {
          onCapture();
        }}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-black">
          <img src="/fi_camera.svg" alt="Camera" className="h-5 w-5" />
        </div>
      </button>
    </div>
  );
}

function ReviewOverlay() {
  const { t } = useTranslation();
  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="flex flex-col items-center rounded-2xl bg-linear-to-b from-white/15 to-white/5 px-6 py-5 text-center text-white shadow-2xl shadow-black/40">
        <div className="mb-3 h-10 w-10 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        <p className="text-sm font-medium text-white/90">{t("L-kRmfOqQd")}</p>
        <p className="mt-1 text-xs text-white/70">{t("L-AoTtuFuI")}</p>
      </div>
    </div>
  );
}

function StatusText({
  state,
  errorMessage,
  onRetry,
}: {
  state: "idle" | "loading" | "ready" | "error";
  errorMessage: string;
  onRetry: () => void;
}) {
  const { t } = useTranslation();
  if (state === "ready") return null;
  const isLoading = state === "idle" || state === "loading";
  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
      <div className="rounded-2xl bg-black/70 px-5 py-4 text-center text-xs text-white/90 backdrop-blur-sm shadow-2xl">
        {isLoading ? (
          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        ) : (
          <>
            <p>{t(errorMessage)}</p>
            <button
              type="button"
              className="pointer-events-auto mt-3 rounded-full px-4 py-1 font-semibold text-white transition hover:bg-white/10"
              onClick={onRetry}
            >
              {t("L-Eu9O2jr8")}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function InfoDrawer() {
  const { t } = useTranslation();
  return (
    <Drawer.Root>
      <Drawer.Trigger asChild>
        <button type="button" className="p-2" aria-label={t("Info")}>
          <img src="/fi_info.svg" alt="Info" className="h-6 w-6" />
        </button>
      </Drawer.Trigger>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-30 bg-black/60" />
        <Drawer.Content className="fixed inset-x-0 bottom-0 z-40 flex justify-center">
          <div className="w-full rounded-t-[32px] bg-white p-6 text-start text-black shadow-2xl">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-slate-300" />
            <h2 className="text-lg font-semibold">{t("L-29EPh1FG")}</h2>
            <p className="mt-2 text-sm text-slate-600">{t("L-RzS2XJr0")}</p>
            <p className="mt-4 text-sm text-slate-500 pb-3">
              {t("L-q2tCEQHX")}
            </p>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

export default CameraScan;
