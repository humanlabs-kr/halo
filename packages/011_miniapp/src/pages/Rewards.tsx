import { useEffect, useMemo, useState } from 'react'
import PageHeader from '../components/PageHeader'

type DailyReward = {
  id: string
  amountLabel: string
  pointsLabel: string
  status: 'claimable' | 'closed' | 'claimed'
}

type RaffleReward = {
  id: string
  reward: string
  entry: string
  note: string
  status: 'enter' | 'closed'
}

const INITIAL_COUNTDOWN =
  14 * 60 * 60 * 1000 + // hours
  12 * 60 * 1000 + // minutes
  20 * 1000 // seconds

const RESET_INTERVAL = 24 * 60 * 60 * 1000

const dailyRewards: DailyReward[] = [
  { id: 'tier-1', amountLabel: '10 USDC', pointsLabel: 'Use 15,000pts', status: 'claimable' },
  { id: 'tier-2', amountLabel: '4 USDC', pointsLabel: 'Use 5,600pts', status: 'closed' },
  { id: 'tier-3', amountLabel: '2 USDC', pointsLabel: 'Use 3,200pts', status: 'claimed' },
  { id: 'tier-4', amountLabel: '1 USDC', pointsLabel: 'Use 1,800pts', status: 'closed' },
  { id: 'tier-5', amountLabel: '0.5 USDC', pointsLabel: 'Use 1,000pts', status: 'closed' },
]

const raffleRewards: RaffleReward[] = [
  { id: 'raffle-10', reward: '10 USDC', entry: 'Use 300pts', note: 'Max 3 entries per day', status: 'enter' },
  { id: 'raffle-4', reward: '4 USDC', entry: 'Use 250pts', note: 'Unlimited entries', status: 'enter' },
  { id: 'raffle-3', reward: '3 USDC', entry: 'Use 200pts', note: 'Unlimited entries', status: 'enter' },
  { id: 'raffle-2', reward: '2 USDC', entry: 'Use 150pts', note: 'Unlimited entries', status: 'enter' },
  { id: 'raffle-1', reward: '1 USDC', entry: 'Use 100pts', note: 'Unlimited entries', status: 'enter' },
]

function Rewards() {
  const [remainingMs, setRemainingMs] = useState(INITIAL_COUNTDOWN)

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setRemainingMs((prev) => {
        if (prev <= 1000) {
          return RESET_INTERVAL
        }
        return prev - 1000
      })
    }, 1000)

    return () => window.clearInterval(intervalId)
  }, [])

  const countdown = useMemo(() => {
    const hours = Math.floor(remainingMs / (60 * 60 * 1000))
    const minutes = Math.floor((remainingMs % (60 * 60 * 1000)) / (60 * 1000))
    const seconds = Math.floor((remainingMs % (60 * 1000)) / 1000)
    return {
      hours: String(hours).padStart(2, '0'),
      minutes: String(minutes).padStart(2, '0'),
      seconds: String(seconds).padStart(2, '0'),
    }
  }, [remainingMs])

  return (
    <div className="flex min-h-screen flex-col bg-white text-black">
      <div className="px-4 pt-6">
        <PageHeader title="Rewards" />
      </div>

      <div className="flex-1 px-4 pb-4">
        <CountdownCard {...countdown} />

        <SectionHeading
          title="Daily Claim Pool"
          subtitle="Refills hourly, limited to 1 claim per 24 hours."
        />
        <div className="mt-3 space-y-2">
          {dailyRewards.map((reward) => (
            <DailyRewardCard key={reward.id} reward={reward} />
          ))}
        </div>

        <SectionHeading
          className="mt-6"
          title="Raffle Reward Pool"
          subtitle="Total of $20 in rewards available daily"
          actionIcon
        />
        <div className="mt-3 space-y-2">
          {raffleRewards.map((reward) => (
            <RaffleRewardCard key={reward.id} reward={reward} />
          ))}
        </div>
      </div>
    </div>
  )
}

type CountdownProps = { hours: string; minutes: string; seconds: string }

function CountdownCard({ hours, minutes, seconds }: CountdownProps) {
  return (
    <section className="mt-4 rounded-[28px] bg-[#292929] px-6 py-4 text-white">
      <div className="flex items-center justify-between gap-3 text-white max-w-[280px] mx-auto">
        <CountdownBlock label="Hours" value={hours} />
        <span className="text-2xl font-semibold text-white/80">:</span>
        <CountdownBlock label="Minutes" value={minutes} />
        <span className="text-2xl font-semibold text-white/80">:</span>
        <CountdownBlock label="Seconds" value={seconds} />
      </div>
    </section>
  )
}

function CountdownBlock({
  value,
  label,
  className = '',
}: {
  value: string
  label: string
  className?: string
}) {
  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className="rounded-2xl text-2xl font-semibold">{value}</div>
      <p className="mt-0.5 text-xs text-[#8D8D8D]">{label}</p>
    </div>
  )
}

function SectionHeading({
  title,
  subtitle,
  className = '',
  actionIcon = false,
}: {
  title: string
  subtitle: string
  className?: string
  actionIcon?: boolean
}) {
  return (
    <div className={`mt-6 px-1.5 flex items-center justify-between ${className}`}>
      <div>
        <p className="text-base font-bold">{title}</p>
        <p className="text-xs text-[#8D8D8D]">{subtitle}</p>
      </div>
      {actionIcon && (
        <img src="/u_arrow-right.svg" alt="More" className="h-5 w-5 text-black" />
      )}
    </div>
  )
}

function DailyRewardCard({ reward }: { reward: DailyReward }) {
  const isPrimary = reward.status === 'claimable'
  const baseBg = isPrimary ? 'bg-[#E7F3FF]' : 'bg-[#F4F4F4]'

  const button = {
    claimable: (
      <button
        type="button"
        className="rounded-full bg-black px-5 py-2 text-sm font-semibold text-white"
      >
        Claim
      </button>
    ),
    closed: (
      <div className="rounded-full bg-[#D6D6D6] px-5 py-2 text-sm font-semibold text-white opacity-70">
        Closed
      </div>
    ),
    claimed: (
      <div className="rounded-full bg-[#D6D6D6] px-5 py-2 text-sm font-semibold text-white opacity-70">
        Claimed
      </div>
    ),
  }[reward.status]

  return (
    <article className={`flex items-center justify-between rounded-[28px] px-5 py-4.5 ${baseBg}`}>
      <div>
        <p className="text-base font-semibold text-black">{reward.amountLabel}</p>
        <p className="text-xs text-[#8D8D8D]">{reward.pointsLabel}</p>
      </div>
      {button}
    </article>
  )
}

function RaffleRewardCard({ reward }: { reward: RaffleReward }) {
  const isDisabled = reward.status === 'closed'
  return (
    <article className="flex items-center justify-between rounded-[28px] bg-[#F4F4F4] px-5 py-4.5">
      <div>
        <p className="text-base font-semibold text-black">{reward.reward}</p>
        <p className="text-xs text-[#8D8D8D]">
          {reward.entry}
          {reward.note ? ` / ${reward.note}` : ''}
        </p>
      </div>
      {isDisabled ? (
        <div className="rounded-full bg-[#D6D6D6] px-5 py-2 text-sm font-semibold text-white opacity-70">
          Closed
        </div>
      ) : (
        <button
          type="button"
          className="rounded-full bg-black px-5 py-2 text-sm font-semibold text-white"
        >
          Enter
        </button>
      )}
    </article>
  )
}

export default Rewards

