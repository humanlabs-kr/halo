import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { getSafeAreaInsetsBottom } from '../utils/device'

const avatarUrl =
  'https://static.usernames.app-backend.toolsforhumanity.com/0x6231a8686d08834bd3d254812aebd6ed002d79f5.png'

const progressList = [
  { label: 'Daily Scans', value: '1/5', ratio: 0.2 },
  { label: 'Weekly Scans', value: '31/35', ratio: 0.89 },
]

function Home() {
  return (
    <>
      <div className="min-h-full bg-white px-4 pt-6 text-black">
        <HomeHeader />
        <section className="mt-6 space-y-3">
          <ProgressCard />
          <TutorialCard />
          <PromoCard />
        </section>
      </div>
      <ScanButton />
    </>
  )
}

function HomeHeader() {
  return (
    <header className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 overflow-hidden rounded-full bg-linear-to-br from-fuchsia-400 via-orange-300 to-yellow-200">
          <img
            src={avatarUrl}
            alt="프로필 이미지"
            className="h-full w-full object-cover mix-blend-multiply"
          />
        </div>
        <div>
          <p className="text-[14px] font-medium text-card-text">@Youngho</p>
          <p className="text-[18px] font-semibold">15,000 Pts</p>
        </div>
      </div>
      <span className="rounded-full bg-card-background px-4 py-1 text-sm font-semibold text-black">
        Lv.5
      </span>
    </header>
  )
}

function ProgressCard() {
  return (
    <article className="rounded-[28px] bg-card-background p-5">
      <div className="space-y-5">
        {progressList.map((item, index) => (
          <ProgressRow key={item.label} delay={index * 150} {...item} />
        ))}
      </div>
    </article>
  )
}

type ProgressRowProps = {
  label: string
  value: string
  ratio: number
  delay?: number
}

function ProgressRow({ label, value, ratio, delay = 0 }: ProgressRowProps) {
  const [fill, setFill] = useState(0)

  useEffect(() => {
    const timer = setTimeout(() => setFill(ratio), 200 + delay)
    return () => clearTimeout(timer)
  }, [ratio, delay])

  return (
    <div>
      <div className="flex items-center justify-between text-sm font-semibold text-black">
        <span>{label}</span>
        <span className="text-card-text text-xs font-medium opacity-80">{value}</span>
      </div>
      <div className="mt-3 h-2 rounded-full bg-gray-200">
        <div
          className="h-2 rounded-full bg-black transition-[width] duration-700 ease-out"
          style={{ width: `${fill * 100}%` }}
        />
      </div>
    </div>
  )
}

function TutorialCard() {
  return (
    <article className="flex items-center gap-4 rounded-[28px] bg-card-background p-4 py-3.5 text-card-text">
      <img
        src="/main-banner.png"
        alt="튜토리얼"
        className="h-12 w-auto rounded-2xl bg-white object-cover mix-blend-darken"
      />
      <div className="flex-1 text-left">
        <p className="text-base font-semibold text-black">First time here?</p>
        <p className="text-sm">Check out the tutorial!</p>
      </div>
      <img src="/u_arrow-right.svg" alt="더보기" className="h-6 w-6" />
    </article>
  )
}

function PromoCard() {
  return (
    <article className="relative min-h-[340px] overflow-hidden rounded-[32px] bg-[#FFAAAA]/20 p-5 text-card-text">
      <img
        src="/main-banner2.png"
        alt="프로모션"
        className="pointer-events-none absolute inset-0 h-full w-full object-cover p-5"
      />
      <div className="relative z-10 mb-4 flex items-center justify-between">
        <div>
          <p className="text-base font-semibold text-black">Limited Time Offer</p>
          <p className="text-sm">November 20th</p>
        </div>
        <img src="/u_arrow-right.svg" alt="더보기" className="h-6 w-6" />
      </div>
    </article>
  )
}

function ScanButton() {
  const navigate = useNavigate()

  return (
    <div className="pointer-events-none fixed left-1/2 z-50 -translate-x-1/2 px-5" style={{ bottom: getSafeAreaInsetsBottom() + 80 }}>
      <button
        type="button"
        className="pointer-events-auto flex w-full items-center justify-center gap-2 rounded-full bg-black px-8 py-3 text-base font-semibold text-white"
        onClick={() => navigate('/camera-scan')}
      >
        <img src="/fi_camera.svg" alt="카메라" className="h-5 w-5" />
        SCAN
      </button>
    </div>
  )
}

export default Home
 