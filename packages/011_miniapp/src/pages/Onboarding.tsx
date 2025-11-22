import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { setOnboardingCompleted } from "../utils/onboardingStorage";

type HistoryCard = {
  kind: "history";
  merchant: string;
  detail: string;
  points: number;
  score: number;
};

type RewardCard = {
  kind: "reward";
  amountLabel: string;
  pointsLabel: string;
  status: "claimable" | "closed" | "claimed";
};

type StepCard = HistoryCard | RewardCard;

const ONBOARDING_STEPS: Array<{
  title: string;
  subtitle: string;
  heroLabel: string;
  heroImage: string;
  cards: StepCard[];
}> = [
  {
    title: "Scan every receipt, on your schedule",
    subtitle: "Any store, any format — snap it up to 5 times a day for guaranteed entries.",
    heroLabel: "Keep earning even while you sleep",
    heroImage: "/onboarding/step-2.webp",
    cards: [],
  },
  {
    title: "See receipt quality & earn instantly",
    subtitle: "Each scan gets a recognition score and deposits fresh points on the spot.",
    heroLabel: "Your daily scan streak is on fire",
    heroImage: "/onboarding/step-2.webp",
    cards: [
      {
        kind: "history",
        merchant: "Carrefour",
        detail: "Claimable · Now",
        points: 25,
        score: 90,
      },
      {
        kind: "history",
        merchant: "Target",
        detail: "Claimable · 2 hrs ago",
        points: 10,
        score: 72,
      },
      {
        kind: "history",
        merchant: "Joe's BBQ",
        detail: "Claimable · Yesterday",
        points: 8,
        score: 64,
      },
    ],
  },
  {
    title: "Swap points for USDC rewards",
    subtitle: "Stack your balance and claim the USDC tier that fits your daily haul.",
    heroLabel: "Link cards once, earn everywhere",
    heroImage: "/onboarding/step-3.webp",
    cards: [
      {
        kind: "reward",
        amountLabel: "10 USDC",
        pointsLabel: "Use 15,000 pts",
        status: "claimable",
      },
      {
        kind: "reward",
        amountLabel: "4 USDC",
        pointsLabel: "Use 5,600 pts",
        status: "closed",
      },
      {
        kind: "reward",
        amountLabel: "2 USDC",
        pointsLabel: "Use 3,200 pts",
        status: "closed",
      },
    ],
  },
];

const AUTO_PROGRESS_DELAY = 4000;
const TRANSITION_DURATION = 0;
const CARD_BASE_DELAY = 220;
const CARD_DELAY_STEP = 130;

function Onboarding() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [progressCycle, setProgressCycle] = useState(0);
  const timerRef = useRef<number | null>(null);
  const transitionRef = useRef<number | null>(null);
  const totalSteps = ONBOARDING_STEPS.length;
  const [flashReady, setFlashReady] = useState(false);

  const goToStep = useCallback(
    (target: number, allowWrap = true) => {
      if (transitionRef.current) {
        clearTimeout(transitionRef.current);
      }
      transitionRef.current = window.setTimeout(() => {
        let normalized = target;
        if (allowWrap) {
          normalized = (target + totalSteps) % totalSteps;
        } else {
          normalized = Math.max(0, Math.min(totalSteps - 1, target));
        }
        setCurrentStep(normalized);
      }, TRANSITION_DURATION);
    },
    [totalSteps]
  );

  const handleNext = () => {
    goToStep(currentStep + 1, true);
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      goToStep(currentStep - 1, false);
    }
  };

  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const SWIPE_THRESHOLD = 50;

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;

    const touchEnd = {
      x: e.changedTouches[0].clientX,
      y: e.changedTouches[0].clientY,
    };

    const deltaX = touchEnd.x - touchStartRef.current.x;
    const deltaY = touchEnd.y - touchStartRef.current.y;
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);

    if (absDeltaX > absDeltaY && absDeltaX > SWIPE_THRESHOLD) {
      if (deltaX > 0) {
        handlePrev();
      } else {
        handleNext();
      }
    }

    touchStartRef.current = null;
  };

  const handleScreenClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const screenWidth = window.innerWidth;
    const clickX = e.clientX;
    const leftHalf = clickX < screenWidth / 2;

    if (leftHalf) {
      handlePrev();
    } else {
      handleNext();
    }
  };

  const handlePrimaryCTA = () => {
    setOnboardingCompleted()
    navigate("/home", { replace: true })
  }

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = window.setTimeout(() => {
      goToStep(currentStep + 1);
    }, AUTO_PROGRESS_DELAY);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [currentStep, goToStep]);

  useEffect(() => {
    setProgressCycle((prev) => prev + 1);
  }, [currentStep]);

  useEffect(() => {
    let flashTimer: number | null = null;
    if (currentStep === 0) {
      setFlashReady(false);
      flashTimer = window.setTimeout(() => setFlashReady(true), 700);
    } else {
      setFlashReady(false);
    }
    return () => {
      if (flashTimer) {
        clearTimeout(flashTimer);
      }
    };
  }, [currentStep]);

  const step = ONBOARDING_STEPS[currentStep];

  return (
    <div
      className="flex min-h-screen flex-col bg-[#E6F3FF] text-black"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onClick={handleScreenClick}
    >
      {/* Progress Indicators */}
      <div className="flex justify-center gap-2 px-5 pt-6">
        {Array.from({ length: totalSteps }).map((_, index) => {
          const isPast = index < currentStep;
          const isCurrent = index === currentStep;
          return (
            <div
              key={index}
              className="relative h-1 flex-1 overflow-hidden rounded-full bg-[#D3E8FF]"
            >
              {(isPast || isCurrent) && (
                <div
                  key={
                    isCurrent ? `${index}-${progressCycle}` : `done-${index}`
                  }
                  className={`h-full rounded-full bg-[#3F7EEB] ${
                    isCurrent ? "animate-progress" : ""
                  }`}
                  style={
                    isCurrent
                      ? { animationDuration: `${AUTO_PROGRESS_DELAY}ms` }
                      : { width: "100%" }
                  }
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Main Content */}
      <div className="flex flex-1 h-full flex-col items-center justify-center px-6 py-6">
        <div className="mb-6 flex h-32 w-full flex-col items-center justify-center text-center">
          <h1 className="text-2xl font-bold leading-tight text-[#0F172A] animate-fade-in">
            {step.title}
          </h1>
          <p className="mt-3 px-4 text-base text-[#54607A] animate-fade-in" style={{ animationDelay: "150ms" }}>
            {step.subtitle}
          </p>
        </div>

        <div className="relative w-full min-h-[320px]">
          <img
            src={step.heroImage}
            alt={`${step.title} preview`}
            className="w-full rounded-[32px]"
          />
          {currentStep === 0 && flashReady && (
            <div
              className="pointer-events-none absolute inset-0 rounded-[32px] animate-flash-mask"
              style={{
                background: "rgba(255,255,255,0.95)",
                WebkitMaskImage: `url(${step.heroImage})`,
                maskImage: `url(${step.heroImage})`,
                WebkitMaskSize: "cover",
                maskSize: "cover",
                WebkitMaskRepeat: "no-repeat",
                maskRepeat: "no-repeat",
              }}
            />
          )}
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-32 rounded-bl-[32px] rounded-br-[32px]"
            style={{
              background: "linear-gradient(to bottom, rgba(255,255,255,0) 0%, #E6F3FF 95%)",
            }}
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-[10px] flex flex-col gap-2 px-3 min-h-[140px]">
            {step.cards.map((card, index) =>
              card.kind === "history" ? (
                <HistoryPreviewCard
                  key={`${step.title}-${index}`}
                  card={card}
                  delay={CARD_BASE_DELAY + index * CARD_DELAY_STEP}
                />
              ) : (
                <RewardPreviewCard
                  key={`${step.title}-${index}`}
                  card={card}
                  delay={CARD_BASE_DELAY + index * CARD_DELAY_STEP}
                />
              )
            )}
          </div>
        </div>

      </div>

      {/* Bottom Button */}
      <div className="px-4 pb-10.5">
        <button
          type="button"
          onClick={handlePrimaryCTA}
          className="w-full rounded-full bg-black py-4 text-base font-semibold text-white"
        >
          Get Started
        </button>
      </div>
    </div>
  );
}

export default Onboarding;

function HistoryPreviewCard({ card, delay }: { card: HistoryCard; delay: number }) {
  return (
    <div
      className="flex items-center justify-between rounded-[22px] bg-[#F7F9FF] px-4 py-3 shadow-inner animate-slide-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center gap-3">
        <ScoreBadge score={card.score} />
        <div>
          <p className="text-sm font-semibold text-[#0F172A]">{card.merchant}</p>
          <p className="text-xs text-[#6B7280]">{card.detail}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-sm font-semibold text-black">{card.points} Pt</p>
      </div>
    </div>
  )
}

function RewardPreviewCard({ card, delay }: { card: RewardCard; delay: number }) {
  const statusConfig = {
    claimable: { label: "Claim", styles: "bg-black text-white" },
    closed: { label: "Closed", styles: "bg-[#D6D6D6] text-white" },
    claimed: { label: "Claimed", styles: "bg-[#D6D6D6] text-white" },
  }[card.status]

  return (
    <div
      className="flex items-center justify-between rounded-[22px] bg-white shadow-[0_0_16px_rgba(15,23,42,0.08)] px-4 py-3.5 animate-slide-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div>
        <p className="text-sm font-semibold text-black">{card.amountLabel}</p>
        <p className="text-xs text-[#8D8D8D]">{card.pointsLabel}</p>
      </div>
      <div className={`rounded-full px-4 py-1 text-xs font-semibold ${statusConfig.styles}`}>
        {statusConfig.label}
      </div>
    </div>
  )
}

function ScoreBadge({ score }: { score: number }) {
  const clamped = Math.min(Math.max(score, 0), 100)
  const tone = getScoreColor(clamped)
  return (
    <div className="relative flex size-[42px] items-center justify-center rounded-full bg-white shadow-[0_2px_6px_rgba(15,23,42,0.08)]">
      <svg viewBox="0 0 40 40" className="absolute inset-0">
        <circle cx="20" cy="20" r="16" stroke="#E5E7EB" strokeWidth="4" fill="none" />
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
      <span className="text-[11px] font-bold" style={{ color: tone }}>
        {clamped}
      </span>
    </div>
  )
}

function getScoreColor(score: number) {
  if (score < 40) return "#F9706A"
  if (score < 70) return "#F5B10A"
  return "#4BCD10"
}
