import { Link, NavLink, useLocation } from 'react-router-dom'
import NotificationBell from '@/features/notifications/NotificationBell'

const NAV_ITEMS = [
  { label: 'Dashboard', icon: 'dashboard', to: '/dashboard/manager', available: true },
  { label: 'Tasks', icon: 'task', to: '/tasks', available: true },
  { label: 'Attendance', icon: 'calendar_month', to: '/attendance', available: true },
  { label: 'Maps', icon: 'map', available: false },
  { label: 'Travel', icon: 'flight_takeoff', available: false },
  { label: 'Leave', icon: 'event_busy', available: false },
  { label: 'Analytics', icon: 'monitoring', available: false },
  { label: 'Dealers', icon: 'storefront', available: false },
  { label: 'Settings', icon: 'settings', available: false },
]

const FOOTER_ITEMS = [
  { label: 'Support', icon: 'help', available: false },
  { label: 'Logout', icon: 'logout', available: false },
]

function SidebarItem({ item, active }) {
  const baseClassName = `group flex items-center gap-3 px-3 py-2.5 text-xs font-bold uppercase tracking-widest transition-colors ${
    active
      ? 'bg-primary text-on-primary'
      : 'text-on-surface-variant hover:bg-surface-container-lowest hover:text-on-surface'
  }`

  if (!item.available) {
    return (
      <div className={`${baseClassName} opacity-60 cursor-not-allowed`}>
        <span className="material-symbols-outlined text-[16px]" aria-hidden="true">{item.icon}</span>
        <span>{item.label}</span>
      </div>
    )
  }

  return (
    <NavLink to={item.to} className={baseClassName}>
      <span className="material-symbols-outlined text-[16px]" aria-hidden="true">{item.icon}</span>
      <span>{item.label}</span>
    </NavLink>
  )
}

export default function AttendanceShell({ crumbs = [], rightSlot = null, children }) {
  const location = useLocation()

  return (
    <div className="min-h-screen bg-surface">
      <div className="min-h-screen lg:grid lg:grid-cols-[240px_1fr]">
        <aside className="hidden lg:flex lg:flex-col bg-surface-container-low border-r border-outline-variant/20">
          <div className="px-6 py-6 border-b border-outline-variant/20">
            <p className="text-xl font-black font-headline text-primary leading-none">Prabhu Seeds</p>
            <p className="text-[10px] mt-2 font-bold uppercase tracking-[0.2em] text-on-surface-variant">Agritask Platform</p>
          </div>

          <nav className="flex-1 px-3 py-4 space-y-1">
            {NAV_ITEMS.map((item) => (
              <SidebarItem
                key={item.label}
                item={item}
                active={item.to === '/attendance' ? location.pathname.startsWith('/attendance') : location.pathname === item.to}
              />
            ))}
          </nav>

          <div className="px-3 py-4 border-t border-outline-variant/20 space-y-1">
            {FOOTER_ITEMS.map((item) => (
              <SidebarItem key={item.label} item={item} active={false} />
            ))}
          </div>
        </aside>

        <div className="min-w-0 flex flex-col">
          <header className="h-14 bg-surface-container-lowest border-b border-outline-variant/20 px-4 sm:px-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-on-surface-variant min-w-0">
              <Link to="/attendance" className="font-bold text-primary whitespace-nowrap">PGA AgriTask</Link>
              {crumbs.map((crumb) => (
                <span key={crumb} className="truncate">/ {crumb}</span>
              ))}
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              {rightSlot}
              <NotificationBell />
              <button type="button" className="h-8 w-8 rounded-full bg-primary-container text-on-primary text-xs font-bold" aria-label="Profile">
                AS
              </button>
            </div>
          </header>

          <div className="lg:hidden border-b border-outline-variant/20 bg-surface-container-low px-4 py-2">
            <div className="flex items-center gap-2 overflow-x-auto">
              <NavLink to="/dashboard/manager" className="px-3 py-1 text-xs font-bold uppercase tracking-wider bg-surface-container-lowest text-on-surface-variant whitespace-nowrap">Dashboard</NavLink>
              <NavLink to="/tasks" className="px-3 py-1 text-xs font-bold uppercase tracking-wider bg-surface-container-lowest text-on-surface-variant whitespace-nowrap">Tasks</NavLink>
              <NavLink to="/attendance" className="px-3 py-1 text-xs font-bold uppercase tracking-wider bg-primary text-on-primary whitespace-nowrap">Attendance</NavLink>
            </div>
          </div>

          <main className="flex-1 px-4 sm:px-6 py-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}
