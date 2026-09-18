import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { Drawer } from "vaul";
import toast from "react-hot-toast";
import Onboarding from "./Onboarding";
import ClaimSuccessModal from "@/components/ClaimSuccessModal";
import HaloMiniBannerCard from "@/components/HaloMiniBannerCard";
import { useAuthStore } from "@/stores/auth";
import { hasApiErrorCode } from "@/lib/api/client";
import {
  pointStatQueryKey,
  useClaimDailyPoint,
  useClaimDailyPointCelo,
  usePointStat,
  useReceiptStat,
  useReceiptTotalCount,
} from "@/lib/api/queries";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { useConnection, useWriteContract } from "wagmi";
import { POINT_CLAIM_ABI } from "@halo/contracts";
import { HALO_SOCIAL_URL, SCAN_LIMIT } from "@/lib/constants";
import { sendSuccessNotificationHaptic } from "@/lib/haptic";
import { PLATFORM_CHAIN } from "@/lib/wagmi";

/**
 * Level tiers:
 * - Level 1: 0-50 pts
 * - Level 2: 51-100 pts
 * - Level 3: 101-150 pts
 * - ...
 * - Level 99: max (50pt increments for all levels)
 */
function calculateLevel(accumulatedPoints: number): number {
  const level = Math.floor(accumulatedPoints / 50) + 1;
  return Math.min(level, 99);
}

function Home() {
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [claimedPoints, setClaimedPoints] = useState(0);

  return (
    <>
      <div className="min-h-full bg-white px-4 pt-6 pb-5 text-black">
        <HomeHeader />
        <section className="mt-5 space-y-3">
          <HaloMiniBannerCard />
          <TotalReceiptCountCard />
          <DailyClaimCard
            onClaimSuccess={(points) => {
              setClaimedPoints(points);
              setShowClaimModal(true);
            }}
          />
          <ProgressCard />
          <TwitterCard />
          <PromoCard />
          <TutorialCard />
          <TroubleshootCard />
        </section>
        <footer className="mt-8 mb-16 flex flex-col items-center gap-2 text-xs text-gray-400">
          <p>Operated by Human Labs</p>
          <div className="flex gap-3">
            <Link to="/terms" className="underline hover:text-gray-600">
              Terms of Service
            </Link>
            <span>·</span>
            <Link to="/privacy" className="underline hover:text-gray-600">
              Privacy Policy
            </Link>
          </div>
        </footer>
      </div>
      <ScanButton />
      {showClaimModal && (
        <ClaimSuccessModal
          points={claimedPoints}
          onClose={() => setShowClaimModal(false)}
        />
      )}
    </>
  );
}

function HomeHeader() {
  const user = useAuthStore((s) => s.user);

  const { data: pointStat } = usePointStat();

  const currentPoints = pointStat?.currentPoint ?? 0;
  const accumulatedHistoricalPoints = pointStat?.accumulatedPoint ?? 0;

  const userLevel = calculateLevel(accumulatedHistoricalPoints);

  const [avatarError, setAvatarError] = useState(false);
  // Narrowed to a single nullable value so the `<img>` below gets a real
  // `string`. The server declares this field nullable — a wallet with no
  // World App profile simply has no picture.
  const avatarUrl = avatarError ? null : user?.profilePictureUrl;
  const initials = user?.username
    ? String(user.username).slice(0, 2).toUpperCase()
    : "?";

  return (
    <header className="flex items-center justify-between px-2 pt-1">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-linear-to-br from-fuchsia-400 via-orange-300 to-yellow-200">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="profile"
              className="h-full w-full object-cover mix-blend-multiply pointer-events-none"
              onError={() => setAvatarError(true)}
            />
          ) : (
            <span className="text-sm font-semibold text-black/70 pointer-events-none">
              {initials}
            </span>
          )}
        </div>
        <div>
          <p className="text-[14px] font-medium text-card-text">
            @{user?.username}
          </p>
          <p className="text-[18px] font-semibold">
            {currentPoints.toLocaleString()} Pts
          </p>
        </div>
      </div>
      <span className="rounded-full bg-card-background px-4 py-1 text-sm font-semibold text-black">
        Lv.{userLevel}
      </span>
    </header>
  );
}

function ProgressCard() {
  const { t } = useTranslation();
  const { data: receiptStat } = useReceiptStat();
  const dailyScanCount = receiptStat?.dailyScanCount ?? 0;
  const weeklyScanCount = receiptStat?.weeklyScanCount ?? 0;

  const progressList = [
    {
      label: t("L-WBIavWEk"),
      value: `${dailyScanCount}/${SCAN_LIMIT.daily}`,
      ratio: Math.min(dailyScanCount / SCAN_LIMIT.daily, 1),
    },
    {
      label: t("L-kwDm0o7W"),
      value: `${weeklyScanCount}/${SCAN_LIMIT.weekly}`,
      ratio: Math.min(weeklyScanCount / SCAN_LIMIT.weekly, 1),
    },
  ];

  return (
    <article className="pressed rounded-[28px] bg-card-background p-5">
      <div className="space-y-5">
        {progressList.map((item, index) => (
          <ProgressRow key={item.label} delay={index * 150} {...item} />
        ))}
      </div>
    </article>
  );
}

type ProgressRowProps = {
  label: string;
  value: string;
  ratio: number;
  delay?: number;
};

function ProgressRow({ label, value, ratio, delay = 0 }: ProgressRowProps) {
  const [fill, setFill] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setFill(ratio), 200 + delay);
    return () => clearTimeout(timer);
  }, [ratio, delay]);

  return (
    <div>
      <div className="flex items-center justify-between text-sm font-semibold text-black">
        <span>{label}</span>
        <span className="text-card-text text-xs font-medium opacity-80">
          {value}
        </span>
      </div>
      <div className="mt-3 h-2 rounded-full bg-gray-200">
        <div
          className="h-2 rounded-full bg-black transition-[width] duration-700 ease-out"
          style={{ width: `${fill * 100}%` }}
        />
      </div>
    </div>
  );
}

function TutorialCard() {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Drawer.Root open={isOpen} onOpenChange={setIsOpen}>
      <Drawer.Trigger asChild>
        <article className="pressed flex items-center gap-4 rounded-[28px] bg-card-background p-4 py-3.5 text-card-text cursor-pointer">
          <img
            src="/main-banner.png"
            alt="Tutorial"
            className="h-12 w-auto rounded-2xl bg-white object-cover mix-blend-darken"
          />
          <div className="flex-1 text-left">
            <p className="text-base font-semibold text-black">
              {t("L-flFsAsRJ")}
            </p>
            <p className="text-sm">{t("L-7kqPke2P")}</p>
          </div>
          <img src="/u_arrow-right.svg" alt="see more" className="h-6 w-6" />
        </article>
      </Drawer.Trigger>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-black/60" />
        <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 flex max-h-[98vh] min-h-[98vh] flex-col bg-[#E6F3FF] rounded-t-[32px]">
          <div className="mx-auto mt-4 h-1 w-10 rounded-full bg-slate-300" />
          <div className="flex-1 overflow-y-auto">
            <Onboarding onClose={() => setIsOpen(false)} />
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

function TroubleshootCard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { signOut } = useAuthStore();

  // Escape hatch for a session the server has forgotten but the client still
  // believes in: drop every local trace and start over at the login screen.
  const handleLogout = async () => {
    localStorage.removeItem(DAILY_CLAIM_KEY.offchain);
    localStorage.removeItem(DAILY_CLAIM_KEY.onchain);
    await signOut();
    navigate("/", { replace: true });
  };

  return (
    <article
      className="pressed flex items-center gap-4 rounded-[28px] bg-card-background p-4 py-3.5 text-card-text cursor-pointer"
      onClick={handleLogout}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100">
        <svg
          className="h-6 w-6 text-amber-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>
      <div className="flex-1 text-left">
        <p className="text-base font-semibold text-black">
          {t("L-TrblShtTl")}
        </p>
        <p className="text-sm">{t("L-TrblShtDs")}</p>
      </div>
      <svg
        className="h-5 w-5 text-gray-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
        />
      </svg>
    </article>
  );
}

function TwitterCard() {
  const { t } = useTranslation();
  const handleClick = () => {
    window.open(HALO_SOCIAL_URL, "_blank");
  };

  return (
    <article
      className="pressed flex items-center gap-4 rounded-[28px] bg-card-background p-4 py-3.5 text-card-text cursor-pointer"
      onClick={handleClick}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-black">
        <svg
          className="h-6 w-6 text-white"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      </div>
      <div className="flex-1 text-left">
        <p className="text-base font-semibold text-black">Halo</p>
        <p className="text-sm">{t("L-oDJ81tHK")}</p>
      </div>
      <img src="/u_arrow-right.svg" alt="see more" className="h-6 w-6" />
    </article>
  );
}

function PromoCard() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <article
      className="pressed relative min-h-[340px] overflow-hidden rounded-[32px] bg-[#FFAAAA]/20 p-5 text-card-text cursor-pointer"
      onClick={() => {
        navigate("/history");
      }}
    >
      <img
        src="/main-banner2.png"
        alt="Promotion"
        className="pointer-events-none absolute inset-0 h-full w-full object-cover p-5"
      />
      <div className="relative z-10 mb-4 flex items-center justify-between">
        <div>
          <p className="text-base font-semibold text-black">
            {t("L-307eOvqi")}
          </p>
          <p className="text-sm">{t("L-AncRaHJ5")}</p>
        </div>
        <img src="/u_arrow-right.svg" alt="see more" className="h-6 w-6" />
      </div>
    </article>
  );
}

function TotalReceiptCountCard() {
  const { t } = useTranslation();
  const { data } = useReceiptTotalCount({ refetchInterval: 3000 });

  const totalCount = data?.totalCount ?? 0;

  return (
    <article className="rounded-[28px] bg-linear-to-br from-violet-500 to-purple-600 p-5 text-white">
      <p className="text-sm font-medium opacity-90">{t("L-FmcAlbdC")}</p>
      <div className="mt-1 flex items-baseline gap-2">
        <AnimatedCounter value={totalCount} />
        <span className="text-lg font-medium opacity-80">🧾</span>
      </div>
    </article>
  );
}

function AnimatedCounter({ value }: { value: number }) {
  const [displayValue, setDisplayValue] = useState(0);
  const previousValue = useRef(0);

  useEffect(() => {
    if (value === 0) return;

    const startValue = previousValue.current;
    const endValue = value;
    const duration = 500; // ms
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease out cubic
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentValue = Math.floor(
        startValue + (endValue - startValue) * easeOut,
      );

      setDisplayValue(currentValue);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        previousValue.current = endValue;
      }
    };

    requestAnimationFrame(animate);
  }, [value]);

  return (
    <span className="text-4xl font-bold tabular-nums">
      {displayValue.toLocaleString()}
    </span>
  );
}

function ScanButton() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div
      className="pointer-events-none fixed left-1/2 z-50 -translate-x-1/2 px-5"
      style={{ bottom: 80 }}
    >
      <button
        type="button"
        className="pointer-events-auto flex w-full items-center justify-center gap-2 rounded-full bg-black px-8 py-3 text-base font-semibold text-white whitespace-nowrap"
        onClick={() => {
          navigate("/camera-scan");
        }}
      >
        <img src="/fi_camera.svg" alt="" className="h-5 w-5" />
        {t("L-X9AEIiZg")}
      </button>
    </div>
  );
}

/**
 * The daily claim resets at UTC midnight, and the API answers
 * ALREADY_CLAIMED after that. The local marks below only keep the button from
 * flashing "claim" on every reload before the first request comes back.
 */
const DAILY_CLAIM_KEY = {
  offchain: "halo.dailyClaim",
  onchain: "halo.dailyClaim.onchain",
} as const;

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

function isClaimedToday(key: string): boolean {
  return localStorage.getItem(key) === todayUTC();
}

function markClaimedToday(key: string): void {
  localStorage.setItem(key, todayUTC());
}

function DailyClaimCard({
  onClaimSuccess,
}: {
  onClaimSuccess: (points: number) => void;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const platform = useAuthStore((s) => s.platform);
  const { address } = useConnection();
  const { mutateAsync: writeContract } = useWriteContract();

  const [isOffchainClaimed, setIsOffchainClaimed] = useState(() =>
    isClaimedToday(DAILY_CLAIM_KEY.offchain),
  );
  const [isOnchainClaimed, setIsOnchainClaimed] = useState(() =>
    isClaimedToday(DAILY_CLAIM_KEY.onchain),
  );

  // Celo mints the daily points on-chain as well, as a second, optional step:
  // the off-chain balance moves immediately and the bonus transaction follows
  // only if the user signs it. No other chain has this step.
  const hasOnchainBonus = platform === "celo";

  const claimOffchain = useClaimDailyPoint({
    onSuccess: (data) => {
      void queryClient.refetchQueries({ queryKey: pointStatQueryKey() });
      markClaimedToday(DAILY_CLAIM_KEY.offchain);
      setIsOffchainClaimed(true);
      sendSuccessNotificationHaptic();
      onClaimSuccess(data.claimedPoint);
    },
    onError: (error) => {
      // Already claimed today is the expected answer after a reinstall or a
      // cleared cache, not a failure — record it locally and move on.
      if (hasApiErrorCode(error, "ALREADY_CLAIMED")) {
        markClaimedToday(DAILY_CLAIM_KEY.offchain);
        setIsOffchainClaimed(true);
      } else {
        toast.error("Claim failed. Try logging out and back in.");
      }
    },
  });

  const claimOnchain = useClaimDailyPointCelo({
    onSuccess: async (data) => {
      if (!address) return;
      try {
        await writeContract({
          address: data.contractAddress as `0x${string}`,
          abi: POINT_CLAIM_ABI,
          functionName: "claimPoints",
          args: [
            BigInt(data.claimedPoint),
            data.claimIdBytes32 as `0x${string}`,
            BigInt(data.deadline),
            data.signature as `0x${string}`,
          ],
          chain: PLATFORM_CHAIN.celo,
          account: address,
        });
        markClaimedToday(DAILY_CLAIM_KEY.onchain);
        setIsOnchainClaimed(true);
        sendSuccessNotificationHaptic();
        onClaimSuccess(data.claimedPoint);
      } catch {
        // Rejected in the wallet, or the transaction failed.
      } finally {
        void queryClient.refetchQueries({ queryKey: pointStatQueryKey() });
      }
    },
    onError: (error) => {
      if (hasApiErrorCode(error, "ALREADY_CLAIMED")) {
        markClaimedToday(DAILY_CLAIM_KEY.onchain);
        setIsOnchainClaimed(true);
      } else {
        toast.error("Claim failed. Try logging out and back in.");
      }
    },
  });

  const showOffchainClaim = !isOffchainClaimed;
  const showOnchainClaim = hasOnchainBonus && isOffchainClaimed && !isOnchainClaimed;
  const hasClaimable = showOffchainClaim || showOnchainClaim;
  const baseBg = hasClaimable ? "bg-[#F3E8FF]" : "bg-[#F4F4F4]";
  const isLoading = claimOffchain.isPending || claimOnchain.isPending;

  const button = showOffchainClaim ? (
    <button
      type="button"
      className={`rounded-full bg-black px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-black/90 ${
        isLoading ? "cursor-not-allowed opacity-50" : ""
      }`}
      onClick={() => claimOffchain.mutate()}
      disabled={isLoading}
    >
      {isLoading ? t("L-qHrxRpu3") : t("L-i9BXd8pD")}
    </button>
  ) : showOnchainClaim ? (
    <button
      type="button"
      className={`rounded-full bg-black px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-black/90 ${
        isLoading ? "cursor-not-allowed opacity-50" : ""
      }`}
      onClick={() => claimOnchain.mutate()}
      disabled={isLoading}
    >
      {isLoading ? t("L-qHrxRpu3") : "Bonus ⛓️"}
    </button>
  ) : (
    <div className="rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-white shadow-sm ring-2 ring-emerald-400/50">
      {t("L-91lAIHgi")}
    </div>
  );

  return (
    <article
      className={`pressed flex items-center justify-between rounded-[28px] ${baseBg} px-5 py-4.5`}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M20 12V22H4V12M22 7H2V12H22V7ZM12 22V7M12 7H7.5C6.83696 7 6.20107 6.73661 5.73223 6.26777C5.26339 5.79893 5 5.16304 5 4.5C5 3.83696 5.26339 3.20107 5.73223 2.73223C6.20107 2.26339 6.83696 2 7.5 2C11 2 12 7 12 7ZM12 7H16.5C17.163 7 17.7989 6.73661 18.2678 6.26777C18.7366 5.79893 19 5.16304 19 4.5C19 3.83696 18.7366 3.20107 18.2678 2.73223C17.7989 2.26339 17.163 2 16.5 2C13 2 12 7 12 7Z"
              stroke="black"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div>
          <p className="text-base font-semibold text-black">
            {t("L-hLxj0K2z")}
          </p>
          <p className="text-xs text-[#8D8D8D]">{t("L-NyioPzTj")}</p>
        </div>
      </div>
      {button}
    </article>
  );
}

export default Home;
