import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Drawer } from "vaul";
import { useCameraStream } from "../hooks/useCameraStream";
import ScanPendingModal from "../components/ScanPendingModal";
import { sendLightImpactHaptic } from "../components/hapticFeedback";

const TOTAL_STEPS = 5;
// TODO: 5번 모두 받았으면 촬영 누를 때 토스트 뜨게하기

function CameraScan() {
  const navigate = useNavigate();
  const { videoRef, state, errorMessage, retry } = useCameraStream();
  const [showPopup, setShowPopup] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);
  const [completedSteps, setCompletedSteps] = useState(1);

  const steps = useMemo(
    () =>
      Array.from({ length: TOTAL_STEPS }, (_, index) => index < completedSteps),
    [completedSteps]
  );

  const handleCapture = () => {
    if (state !== "ready" || isReviewing) return;
    if (!videoRef.current || videoRef.current.readyState < 2) return;

    setIsReviewing(true);
    capturePhoto(videoRef, () => {
      setTimeout(() => {
        setCompletedSteps((prev) => Math.min(TOTAL_STEPS, prev + 1));
        setIsReviewing(false);
        setShowPopup(true);
        if (videoRef.current) {
          videoRef.current.pause();
        }
      }, 900);
    });
  };

  const handleModalClose = () => {
    setShowPopup(false);
    if (videoRef.current && videoRef.current.paused) {
      videoRef.current.play().catch((err) => {
        console.warn('Video play error after modal close:', err);
      });
    }
  };

  return (
    <div className="flex min-h-screen justify-center bg-black text-white">
      <div className="relative flex min-h-screen w-full flex-col px-4 pt-4 pb-12">
        <ScannerFrame
          videoRef={videoRef}
          state={state}
        />

        <div className="relative z-10 flex flex-1 flex-col">
          <Header onClose={() => navigate(-1)} />
          <StepIndicator steps={steps} />
        </div>

        {isReviewing && <ReviewOverlay />}

        <CaptureButton
          disabled={state !== "ready" || isReviewing}
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
      </div>
    </div>
  );
}

function Header({ onClose }: { onClose: () => void }) {
  return (
    <header className="flex items-center justify-between text-white">
      <button type="button" onClick={onClose} aria-label="Close">
        <img src="/u_multiply.svg" alt="Close" className="h-6 w-6" />
      </button>
      <div className="text-base font-semibold">Daily Scans</div>
      <InfoDrawer />
    </header>
  );
}

function StepIndicator({ steps }: { steps: boolean[] }) {
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
            <img src="/fi_check.svg" alt="Completed" className="h-3.5 w-3.5" />
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
  return (
    <div className="pointer-events-none fixed bottom-10 left-1/2 z-20 -translate-x-1/2">
      <button
        type="button"
        className="pointer-events-auto flex h-16 w-16 items-center justify-center rounded-full border-2 border-white bg-white/10 disabled:opacity-40"
        aria-label="Capture"
        disabled={disabled}
        onClick={() => {
          sendLightImpactHaptic()
          onCapture()
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
  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="flex flex-col items-center rounded-2xl bg-linear-to-b from-white/15 to-white/5 px-6 py-5 text-center text-white shadow-2xl shadow-black/40">
        <div className="mb-3 h-10 w-10 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        <p className="text-sm font-medium text-white/90">
          Processing receipt...
        </p>
        <p className="mt-1 text-xs text-white/70">
          This usually takes just a moment.
        </p>
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
  if (state === "ready") return null;
  const isLoading = state === "idle" || state === "loading";
  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
      <div className="rounded-2xl bg-black/70 px-5 py-4 text-center text-xs text-white/90 backdrop-blur-sm shadow-2xl">
        {isLoading ? (
          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        ) : (
          <>
            <p>{errorMessage}</p>
            <button
              type="button"
              className="pointer-events-auto mt-3 rounded-full px-4 py-1 font-semibold text-white transition hover:bg-white/10"
              onClick={onRetry}
            >
              Retry
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function capturePhoto(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  onSuccess: () => void
) {
  const video = videoRef.current;
  if (!video || video.readyState < 2) return;

  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth || 1080;
  canvas.height = video.videoHeight || 1920;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  canvas.toBlob((blob) => {
    if (!blob) return;
    // TODO: send captured blob to the server for review/upload when API is ready.
    onSuccess();
  }, "image/png");
}

function InfoDrawer() {
  return (
    <Drawer.Root>
      <Drawer.Trigger asChild>
        <button type="button" className="p-2" aria-label="Info">
          <img src="/fi_info.svg" alt="Info" className="h-6 w-6" />
        </button>
      </Drawer.Trigger>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-30 bg-black/60" />
        <Drawer.Content className="fixed inset-x-0 bottom-0 z-40 flex justify-center">
          <div className="w-full rounded-t-[32px] bg-white p-6 text-start text-black shadow-2xl">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-slate-300" />
            <h2 className="text-lg font-semibold">How to scan</h2>
            <p className="mt-2 text-sm text-slate-600">
              Please make sure the entire receipt fits within the frame before
              scanning. Scanning works best in a well-lit environment.
            </p>
            <p className="mt-4 text-sm text-slate-500 pb-3">
              If your receipt isn&apos;t recognized, try cleaning your camera
              lens or move to a brighter area without shadows.
            </p>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

export default CameraScan;
