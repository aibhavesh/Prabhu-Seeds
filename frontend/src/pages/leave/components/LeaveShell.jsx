import { NavLink, useLocation } from 'react-router-dom'
import NotificationBell from '@/features/notifications/NotificationBell'
import { useAuthStore } from '@/store/authStore'

function dashboardPathByRole(role) {
  if (role === 'owner') return '/dashboard/owner'
  if (role === 'manager') return '/dashboard/manager'
  if (role === 'accounts') return '/dashboard/accounts'
  return '/dashboard/field'
}

function SidebarItem({ item }) {
  const baseClassName = `group flex items-center gap-3 px-3 py-2.5 text-xs font-bold uppercase tracking-widest transition-colors ${
    item.active
      ? 'bg-primary text-on-primary'
      : 'text-on-surface-variant hover:bg-surface-container-lowest hover:text-on-surface'
  }`

  if (!item.to) {
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

export default function LeaveShell({ title, subtitle, rightSlot = null, children }) {
  const user = useAuthStore((s) => s.user)
  const location = useLocation()
  const dashboardTo = dashboardPathByRole(user?.role)

  const navItems = [
    { label: 'Dashboard', icon: 'dashboard', to: dashboardTo, active: false },
    { label: 'Tasks', icon: 'task', to: '/tasks', active: false },
    { label: 'Attendance', icon: 'calendar_month', to: '/attendance', active: false },
    { label: 'Travel', icon: 'flight_takeoff', to: '/travel', active: false },
    { label: 'Team Leaves', icon: 'groups', to: user?.role === 'owner' || user?.role === 'manager' ? '/leave/manage' : null, active: false },
    { label: 'My Leaves', icon: 'event', to: '/leave', active: false },
    { label: 'Analytics', icon: 'monitoring', to: null, active: false },
    { label: 'Settings', icon: 'settings', to: null, active: false },
  ]

  return (
    <div className="min-h-screen bg-surface">
      <div className="min-h-screen lg:grid lg:grid-cols-[240px_1fr]">
        <aside className="hidden lg:flex lg:flex-col bg-surface-container-low border-r border-outline-variant/20">
          <div className="px-6 py-6 border-b border-outline-variant/20">
            <p className="text-xl font-black font-headline text-primary leading-none">Prabhu Seeds</p>
            <p className="text-[10px] mt-2 font-bold uppercase tracking-[0.2em] text-on-surface-variant">Agritask Platform</p>
          </div>

          <nav className="flex-1 px-3 py-4 space-y-1">
            {navItems.map((item) => (
              <SidebarItem
                key={item.label}
                item={{
                  ...item,
                  active:
                    (item.to === '/leave' && location.pathname === '/leave') ||
                    (item.to === '/leave/manage' && location.pathname.startsWith('/leave/manage')) ||
                    false,
                }}
              />
            ))}
          </nav>

          <div className="px-4 py-3 border-t border-outline-variant/20 space-y-3">
            <p className="text-xs text-on-surface-variant">Support</p>
            <p className="text-xs text-on-surface-variant">Help Center</p>
          </div>
        </aside>

        <div className="min-w-0 flex flex-col">
          <header className="h-auto min-h-14 bg-surface-container-lowest border-b border-outline-variant/20 px-4 sm:px-6 py-3 flex items-center justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <h1 className="text-[2rem] md:text-[2.2rem] font-black font-headline leading-none text-on-surface">{title}</h1>
              {subtitle && <p className="text-on-surface-variant mt-1 font-medium text-sm">{subtitle}</p>}
            </div>

            <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-end">
              {rightSlot}
              <NotificationBell />
              <button type="button" className="h-8 w-8 rounded-full bg-primary-container text-on-primary text-xs font-bold" aria-label="Profile">
                {String(user?.name ?? 'U')
                  .split(' ')
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((part) => part[0]?.toUpperCase() ?? '')
                  .join('') || 'US'}
              </button>
            </div>
          </header>

          <div className="lg:hidden border-b border-outline-variant/20 bg-surface-container-low px-4 py-2">
            <div className="flex items-center gap-2 overflow-x-auto">
              <NavLink to="/leave/manage" className="px-3 py-1 text-xs font-bold uppercase tracking-wider bg-surface-container-lowest text-on-surface-variant whitespace-nowrap">Team Leaves</NavLink>
              <NavLink to="/leave" className="px-3 py-1 text-xs font-bold uppercase tracking-wider bg-primary text-on-primary whitespace-nowrap">My Leaves</NavLink>
            </div>
          </div>

          <main className="flex-1 px-4 sm:px-6 py-6">{children}</main>
        </div>
      </div>
    </div>
  )
}
