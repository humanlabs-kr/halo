import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Drawer } from "vaul";
import { getSafeAreaInsetsBottom } from "../utils/device";
import { sendLightImpactHaptic } from "../components/hapticFeedback";
import Onboarding from "./Onboarding";
import { useWorldAuthStore } from "@/utils/state/use-world-auth-store";

const progressList = [
  { label: "Daily Scans", value: "1/5", ratio: 0.2 },
  { label: "Weekly Scans", value: "31/35", ratio: 0.89 },
];

function Home() {
  return (
    <>
      <div className="min-h-full bg-white px-4 pt-6 pb-5 text-black">
        <HomeHeader />
        <section className="mt-5 space-y-3">
          <ProgressCard />
          <TutorialCard />
          <PromoCard />
        </section>
      </div>
      <ScanButton />
    </>
  );
}

function HomeHeader() {
  const { user } = useWorldAuthStore();
  return (
    <header className="flex items-center justify-between px-2 pt-1">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 overflow-hidden rounded-full bg-linear-to-br from-fuchsia-400 via-orange-300 to-yellow-200">
          <img
            src={user.profilePictureUrl}
            alt="프로필 이미지"
            className="h-full w-full object-cover mix-blend-multiply"
          />
        </div>
        <div>
          <p className="text-[14px] font-medium text-card-text">
            @{user.username}
          </p>
          <p className="text-[18px] font-semibold">15,000 Pts</p>
        </div>
      </div>
      <span className="rounded-full bg-card-background px-4 py-1 text-sm font-semibold text-black">
        Lv.5
      </span>
    </header>
  );
}

function ProgressCard() {
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
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Drawer.Root open={isOpen} onOpenChange={setIsOpen}>
      <Drawer.Trigger asChild>
        <article className="pressed flex items-center gap-4 rounded-[28px] bg-card-background p-4 py-3.5 text-card-text cursor-pointer">
          <img
            src="/main-banner.png"
            alt="튜토리얼"
            className="h-12 w-auto rounded-2xl bg-white object-cover mix-blend-darken"
          />
          <div className="flex-1 text-left">
            <p className="text-base font-semibold text-black">
              First time here?
            </p>
            <p className="text-sm">Check out the tutorial!</p>
          </div>
          <img src="/u_arrow-right.svg" alt="더보기" className="h-6 w-6" />
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

function PromoCard() {
  return (
    <article className="pressed relative min-h-[340px] overflow-hidden rounded-[32px] bg-[#FFAAAA]/20 p-5 text-card-text">
      <img
        src="/main-banner2.png"
        alt="프로모션"
        className="pointer-events-none absolute inset-0 h-full w-full object-cover p-5"
      />
      <div className="relative z-10 mb-4 flex items-center justify-between">
        <div>
          <p className="text-base font-semibold text-black">
            Limited Time Offer
          </p>
          <p className="text-sm">November 20th</p>
        </div>
        <img src="/u_arrow-right.svg" alt="더보기" className="h-6 w-6" />
      </div>
    </article>
  );
}

function ScanButton() {
  const navigate = useNavigate();

  return (
    <div
      className="pointer-events-none fixed left-1/2 z-50 -translate-x-1/2 px-5"
      style={{ bottom: getSafeAreaInsetsBottom() + 80 }}
    >
      <button
        type="button"
        className="pointer-events-auto flex w-full items-center justify-center gap-2 rounded-full bg-black px-8 py-3 text-base font-semibold text-white"
        onClick={() => {
          sendLightImpactHaptic();
          navigate("/camera-scan");
        }}
      >
        <img src="/fi_camera.svg" alt="카메라" className="h-5 w-5" />
        SCAN
      </button>
    </div>
  );
}

export default Home;
