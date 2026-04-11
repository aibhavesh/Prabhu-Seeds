import { NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { NAV_BY_ROLE } from '@/lib/navConfig'
import NotificationBell from '@/features/notifications/NotificationBell'

// ── Sidebar nav item ───────────────────────────────────────────────────────

function SidebarItem({ item }) {
  return (
    <NavLink
      to={item.to}
      className={({ isActive }) =>
        `flex items-center gap-3 px-4 py-2.5 text-xs font-semibold tracking-tight transition-colors ${
          isActive
            ? 'text-primary bg-surface-container-lowest border-r-2 border-primary font-bold'
            : 'text-on-surface-variant hover:bg-surface-container-lowest/60'
        }`
      }
    >
      <span className="material-symbols-outlined text-[15px]" aria-hidden="true">{item.icon}</span>
      <span>{item.label}</span>
    </NavLink>
  )
}

// ── Topbar helper (used by pages that want a custom top bar) ───────────────

export function DashboardTopbar({ left, right }) {
  return (
    <header className="h-14 bg-surface-container-lowest border-b border-outline-variant/25 px-4 sm:px-6 flex items-center justify-between gap-3">
      <div className="min-w-0">{left}</div>
      <div className="flex items-center gap-2">{right}</div>
    </header>
  )
}

// ── Shell ──────────────────────────────────────────────────────────────────

/**
 * Single, role-aware shell used by every page.
 * Reads the logged-in user from authStore and builds the correct sidebar
 * automatically — pages no longer pass navItems.
 */
export default function DashboardShell({
  brandTitle = 'Prabhu Seeds',
  brandSubtitle = 'Agritask Platform',
  topbar,
  children,
}) {
  const user      = useAuthStore((s) => s.user)
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const navigate  = useNavigate()

  // Role-specific nav items — never cross-contaminate across roles
  const navItems = NAV_BY_ROLE[user?.role?.toLowerCase()] ?? []

  const initials = String(user?.name ?? 'U')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('') || 'U'

  function handleLogout() {
    clearAuth()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-surface text-on-surface lg:grid lg:grid-cols-[220px_1fr]">

      {/* ── Sidebar ───────────────────────────────────────────────────────── */}
      <aside className="hidden lg:flex lg:flex-col bg-surface-container-low border-r border-outline-variant/25">

        {/* Brand */}
        <div className="px-5 py-5 border-b border-outline-variant/20">
          <p className="text-base font-black font-headline text-primary uppercase tracking-tight">{brandTitle}</p>
          <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.18em] text-on-surface-variant/70">{brandSubtitle}</p>
        </div>

        {/* Nav links — built from role, never hardcoded */}
        <nav className="flex-1 py-3 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => (
            <SidebarItem key={item.label} item={item} />
          ))}
        </nav>

        {/* User card + logout */}
        <div className="px-3 py-4 border-t border-outline-variant/20 space-y-1">
          <div className="flex items-center gap-2 px-4 py-2">
            <span className="h-7 w-7 rounded-full bg-primary-container text-on-primary text-[10px] font-bold flex items-center justify-center flex-shrink-0">
              {initials}
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-on-surface truncate">{user?.name ?? 'User'}</p>
              <p className="text-[10px] text-on-surface-variant capitalize">{user?.role?.toLowerCase()}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold tracking-tight text-on-surface-variant hover:bg-surface-container-lowest/60 transition-colors"
          >
            <span className="material-symbols-outlined text-[15px]" aria-hidden="true">logout</span>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* ── Mobile top nav ─────────────────────────────────────────────────── */}
      <div className="lg:hidden border-b border-outline-variant/25 bg-surface-container-low px-4 py-2 flex items-center gap-2 overflow-x-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.label}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap transition-colors ${
                isActive ? 'bg-primary text-on-primary' : 'bg-surface-container-lowest text-on-surface-variant'
              }`
            }
          >
            <span className="material-symbols-outlined text-[13px]" aria-hidden="true">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </div>

      {/* ── Main content ───────────────────────────────────────────────────── */}
      <div className="min-w-0 flex flex-col">
        {topbar}
        <main className="flex-1 px-3 sm:px-5 py-5">{children}</main>
      </div>
    </div>
  )
}
