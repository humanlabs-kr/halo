import { useEffect } from "react";
import confetti from "canvas-confetti";
import HumanPassLink from "./HumanPassLink";

type ClaimSuccessModalProps = {
  points: number;
  onClose: () => void;
};

function ClaimSuccessModal({ points, onClose }: ClaimSuccessModalProps) {
  useEffect(() => {
    const timeout = setTimeout(() => {
      confetti({ particleCount: 160, spread: 80, origin: { y: 0.4 } });
    }, 150);

    return () => clearTimeout(timeout);
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
      style={{ zIndex: 60 }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full rounded-[32px] bg-white p-4 text-center text-black shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="relative mx-auto mb-8 mt-12 flex h-[60px] w-[60px] items-center justify-center rounded-full bg-success text-white">
          <img src="/fi_check.svg" alt="Completed" className="z-10 h-9 w-9" />
          <img
            src="/v3.png"
            alt="accent curve"
            className="pointer-events-none absolute -left-11 -top-6 z-0 h-auto w-7"
          />
          <img
            src="/v2.png"
            alt="accent dot"
            className="pointer-events-none absolute -right-13 top-0 z-0 h-4 w-4"
          />
          <img
            src="/v1.png"
            alt="accent star"
            className="pointer-events-none absolute -right-25 -bottom-16 z-0 h-6 w-6"
          />
        </div>
        <div className="relative z-20 space-y-2">
          <h2 className="text-2xl font-semibold">{points} Points Claimed.</h2>
          <p className="text-sm text-slate-500">
            Nice! Your rewards are locked in. <br />Check your history for details.
          </p>
        </div>
        <div className="mb-1 mt-6 flex flex-col gap-2">
          <button
            type="button"
            className="rounded-full bg-black py-4 font-semibold text-white"
            onClick={onClose}
          >
            Close
          </button>
          <HumanPassLink className="mt-2 w-full" />
        </div>
      </div>
    </div>
  );
}

export default ClaimSuccessModal;

