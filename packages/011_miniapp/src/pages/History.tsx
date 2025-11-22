import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import PageHeader from '../components/PageHeader'
import ClaimSuccessModal from '../components/ClaimSuccessModal'
import { sendLightImpactHaptic, sendSuccessNotificationHaptic } from '../components/hapticFeedback'

type ReceiptStatus = 'pending' | 'rejected' | 'claimable' | 'claimed'

type ReceiptItem = {
  id: string
  merchant: string
  timeAgo: string
  amount: string
  status: ReceiptStatus
  score?: number
  points?: number
}

const mockReceipts: ReceiptItem[] = [
  { id: 'rcp-102', merchant: "Peet's Coffee", timeAgo: '20 minutes ago', amount: '$10.75', status: 'pending' },
  { id: 'rcp-100', merchant: 'Starbucks', timeAgo: '15 minutes ago', amount: '$16.20', status: 'claimed', score: 97, points: 25 },
  { id: 'rcp-105', merchant: "Gloria Jean's Coffees", timeAgo: '30 minutes ago', amount: '$11.60', status: 'claimable', score: 85, points: 5 },
  { id: 'rcp-103', merchant: 'Not recognized', timeAgo: '5 minutes ago', amount: '$14.90', status: 'rejected' },
  { id: 'rcp-104', merchant: 'Tim Hortons', timeAgo: '25 minutes ago', amount: '$9.30', status: 'claimable', score: 67, points: 10 },
  { id: 'rcp-106', merchant: 'McDonald\'s', timeAgo: '25 minutes ago', amount: '$9.30', status: 'claimable', score: 67, points: 10 },
  { id: 'rcp-113', merchant: 'Dunkin\' Donuts', timeAgo: '14 minutes ago', amount: '$3.95', status: 'claimable', score: 44, points: 2 },
  { id: 'rcp-110', merchant: 'Subway', timeAgo: '10 minutes ago', amount: '$5.85', status: 'claimable', score: 38, points: 3 },
  { id: 'rcp-108', merchant: 'Burger King', timeAgo: '45 minutes ago', amount: '$7.90', status: 'claimable', score: 56, points: 6 },
  { id: 'rcp-107', merchant: 'KFC', timeAgo: '1 hour ago', amount: '$12.40', status: 'claimable', score: 73, points: 14 },
  { id: 'rcp-111', merchant: 'Taco Bell', timeAgo: '2 hours ago', amount: '$17.15', status: 'claimable', score: 87, points: 18 },
  { id: 'rcp-112', merchant: 'Wendy\'s', timeAgo: '3 hours ago', amount: '$8.50', status: 'claimable', score: 60, points: 8 },
  { id: 'rcp-109', merchant: 'Pizza Hut', timeAgo: '1 day ago', amount: '$25.30', status: 'claimable', score: 91, points: 32 },
]

const statusMeta: Record<ReceiptStatus, { label: string }> = {
  pending: { label: 'Processing' },
  rejected: { label: 'Rejected' },
  claimable: { label: 'Claimable' },
  claimed: { label: 'Claimed' },
}

function History() {
  const receipts = useMemo(() => mockReceipts, [])
  // TODO: 클레임 포인트 API 연동 전 임시 코드
  const [showClaimModal, setShowClaimModal] = useState(false)
  const claimablePoints = useMemo(
    () =>
      receipts.reduce((sum, item) => {
        if (item.status === 'claimable' && typeof item.points === 'number') {
          return sum + item.points
        }
        return sum
      }, 0),
    [receipts]
  )

  return (
    <div className="flex h-full flex-col bg-white text-black pb-4">
      <div className="px-5 pt-6">
        <PageHeader title="History" />
      </div>

      <div className="flex-1 px-4">
        <ReadyCard claimablePoints={claimablePoints} onClaim={() => setShowClaimModal(true)} />
        <ResultsToolbar total={receipts.length} />
        <div className="mt-2.5 space-y-2">
          {receipts.map((item) => (
            <ReceiptCell key={item.id} item={item} />
          ))}
        </div>
      </div>
      {showClaimModal && <ClaimSuccessModal points={claimablePoints} onClose={() => setShowClaimModal(false)} />}
    </div>
  )
}

function ReadyCard({ claimablePoints, onClaim }: { claimablePoints: number; onClaim: () => void }) {
  const hasClaimable = claimablePoints > 0
  return (
    <article className={`mt-5 pressed flex items-center justify-between rounded-[28px] ${hasClaimable ? 'bg-[#E7F3FF]' : 'bg-[#F4F4F4]'} px-5 py-4.5`}>
      <div>
        <p className="text-base font-semibold text-black">
          {hasClaimable ? 'Rewards ready to claim' : 'Ready to scan?'}
        </p>
        <p className="text-xs text-[#8D8D8D]">
          {hasClaimable ? `${claimablePoints}Pts available` : 'Upload a receipt and earn rewards'}
        </p>
      </div>
      {hasClaimable ? (
        <button
          type="button"
          className="rounded-full bg-black px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-black/90"
          onClick={() => {
            sendSuccessNotificationHaptic()
            onClaim()
          }}
        >
          Claim
        </button>
      ) : (
        <Link
          to="/camera-scan"
          className="rounded-full bg-black px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-black/90"
          onClick={() => sendLightImpactHaptic()}
        >
          SCAN
        </Link>
      )}
    </article>
  )
}

function ResultsToolbar({ total }: { total: number }) {
  return (
    <div className="mt-5.5 flex items-center justify-between px-1.5">
      <p className="text-base font-semibold text-black">{total} Results</p>
      <button
        type="button"
        className="flex items-center gap-1 text-xs font-semibold text-black"
        aria-label="Sort by date"
      >
        <ArrowDownIcon className="h-4 w-4 text-black" />
        Date
      </button>
    </div>
  )
}

function ReceiptCell({ item }: { item: ReceiptItem }) {

  const meta = statusMeta[item.status]
  if (item.status === 'pending') {
    return (
      <article className="pressed flex items-center justify-between rounded-[28px] bg-[#F4F4F4] px-5 py-4.5">
        <div>
          <p className="text-base font-semibold text-black">{meta.label}</p>
          <p className="text-xs text-[#6C6C6C]">{item.timeAgo}</p>
        </div>
        <img src="/fi_clock.svg" alt="Clock" className="h-6 w-6 text-[#585858]" />
      </article>
    )
  }

  if (item.status === 'rejected') {
    return (
      <article className="pressed flex items-center justify-between rounded-[28px] bg-[#F4F4F4] px-5 py-4.5">
        <div className="flex items-center gap-3.5">
          <ScoreBadge score={0} />
          <div>
            <p className="text-base font-semibold text-black">{meta.label}</p>
            <p className="text-xs text-[#6C6C6C]">{item.timeAgo}</p>
          </div>
        </div>
        <p className="text-base font-semibold text-black">0Pt</p>
      </article>
    )
  }

  return (
    <article className="pressed flex items-center justify-between rounded-[28px] bg-[#F4F4F4] px-5 py-4.5">
      <div className="flex items-center gap-3.5">
      <ScoreBadge score={item.score} />
        <div className="space-y-1">
          <p className="text-base font-semibold text-black">{item.merchant}</p>
          <p className="text-xs text-[#6C6C6C]">
            <span>{meta.label}</span>
            <span> · </span>
            <span>{item.timeAgo}</span>
          </p>
        </div>
      </div>
      <p className="text-base font-semibold text-black">{item.points || 0}Pt</p>
    </article>
  )
}

function ScoreBadge({ score }: { score: number }) {
  const clamped = Math.min(Math.max(score, 0), 100)
  const tone = getScoreColor(clamped)
  return (
    <div className="relative flex size-[46px] items-center justify-center rounded-full bg-white shadow-[0_2px_6px_rgba(15,23,42,0.08)]">
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
      <span className="text-sm font-bold" style={{ color: tone }}>
        {clamped}
      </span>
    </div>
  )
}

function getScoreColor(score: number) {
  if (score < 40) return '#F9706A'
  if (score < 70) return '#F5B10A'
  return '#4BCD10'
}

function ArrowDownIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M10 5v10" />
      <path d="m6 11 4 4 4-4" />
    </svg>
  )
}

export default History

