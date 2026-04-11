import { NavLink } from 'react-router-dom'
import NotificationBell from '@/features/notifications/NotificationBell'

const NAV_ITEMS = [
  { label: 'Dashboard', to: '/dashboard/accounts' },
  { label: 'Tasks', to: '/tasks' },
  { label: 'Maps', to: '/attendance' },
  { label: 'Travel', to: '/travel' },
]

export default function TravelShell({ title, subtitle, children, rightSlot = null }) {
  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-[1360px] mx-auto lg:grid lg:grid-cols-[240px_1fr] min-h-screen">
        <aside className="hidden lg:flex flex-col bg-surface-container-low border-r border-outline-variant/20">
          <div className="px-5 py-5 border-b border-outline-variant/20">
            <p className="text-xl font-black font-headline text-primary">PrabhuSeeds</p>
            <p className="text-[10px] uppercase tracking-[0.2em] text-on-surface-variant font-bold mt-1">Agritask Platform</p>
          </div>

          <nav className="px-3 py-4 space-y-1">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.label}
                to={item.to}
                className={({ isActive }) =>
                  `block px-3 py-2 text-xs font-bold uppercase tracking-widest ${
                    isActive ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-container-lowest'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>

        <div className="min-w-0 flex flex-col">
          <header className="h-14 bg-surface-container-lowest border-b border-outline-variant/20 px-4 sm:px-6 flex items-center justify-between gap-3">
            <div className="flex items-center gap-6 text-sm min-w-0 overflow-x-auto">
              <p className="text-lg font-black font-headline text-primary whitespace-nowrap">AGRITASK PLATFORM</p>
              <div className="hidden sm:flex items-center gap-5 text-on-surface-variant">
                <span>Dashboard</span>
                <span>Analytics</span>
                <span>Logistics</span>
                <span className="text-primary font-bold">Travel</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {rightSlot}
              <NotificationBell />
              <button type="button" className="h-8 w-8 rounded-full bg-primary-container text-on-primary text-xs font-bold" aria-label="Profile">AT</button>
            </div>
          </header>

          <main className="px-4 sm:px-6 py-6 space-y-6">
            <div>
              <h1 className="text-4xl font-black font-headline tracking-tight text-on-surface">{title}</h1>
              {subtitle && <p className="text-on-surface-variant mt-1 font-medium">{subtitle}</p>}
            </div>
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}
