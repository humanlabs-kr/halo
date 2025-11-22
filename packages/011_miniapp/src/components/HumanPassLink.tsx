const HUMAN_PASS_URL = 'https://world.org/mini-app?app_id=app_5489eac6be2cd3e22ec119e2756928c5'

type HumanPassLinkProps = {
  className?: string
}

function HumanPassLink({ className }: HumanPassLinkProps) {
  return (
    <a
      href={HUMAN_PASS_URL}
      target="_blank"
      rel="noreferrer"
      className={[
        'inline-flex w-fit items-center justify-center text-xs font-medium text-slate-500 underline-offset-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 focus-visible:ring-offset-white',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      Powered by <span className="ml-1 underline">Human Pass</span>
    </a>
  )
}

export default HumanPassLink

