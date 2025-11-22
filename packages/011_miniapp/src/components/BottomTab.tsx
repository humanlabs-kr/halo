import { NavLink, useLocation } from 'react-router'
import { getSafeAreaInsetsBottom } from '../utils/device'

const tabs = [
  { path: '/history', label: 'History', icon: '/u_receipt.svg' },
  { path: '/home', label: 'Home', icon: '/u_home-alt.svg' },
  { path: '/rewards', label: 'Rewards', icon: '/u_gift.svg' },
]

function BottomTab() {
  const location = useLocation()
  const bottomInset = getSafeAreaInsetsBottom()

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white/95 backdrop-blur"
      style={{ paddingBottom: bottomInset }}
    >
      <div className="mx-auto flex max-w-[420px] items-stretch justify-between">
        {tabs.map(({ path, label, icon }) => {
          const isActive =
            location.pathname === path || location.pathname.startsWith(`${path}/`)

          return (
            <NavLink
              key={path}
              to={path}
              className={[
                'flex flex-1 flex-col items-center justify-center gap-1 rounded-2xl py-3 text-xs font-medium transition',
                isActive ? 'text-black opacity-100' : 'text-slate-400 opacity-60',
              ].join(' ')}
            >
              <img
                src={icon}
                alt={`${label} icon`}
                className={['h-6 w-6', isActive ? 'opacity-100' : 'opacity-40'].join(' ')}
              />
              <span>{label}</span>
            </NavLink>
          )
        })}
      </div>
    </div>
  )
}

export default BottomTab

