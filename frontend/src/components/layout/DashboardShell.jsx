import { NavLink } from 'react-router-dom'

function SidebarItem({ item }) {
  const baseClass = 'flex items-center gap-3 px-4 py-2.5 text-xs font-semibold tracking-tight transition-colors'

  if (!item.to) {
    return (
      <div className={`${baseClass} text-on-surface-variant/75`}>
        <span className="material-symbols-outlined text-[15px]" aria-hidden="true">{item.icon}</span>
        <span>{item.label}</span>
      </div>
    )
  }

  return (
    <NavLink
      to={item.to}
      className={({ isActive }) =>
        `${baseClass} ${isActive ? 'text-primary bg-surface-container-lowest border-r-2 border-primary font-bold' : 'text-on-surface-variant hover:bg-surface-container-lowest/60'}`
      }
    >
      <span className="material-symbols-outlined text-[15px]" aria-hidden="true">{item.icon}</span>
      <span>{item.label}</span>
    </NavLink>
  )
}

export function DashboardTopbar({ left, right }) {
  return (
    <header className="h-14 bg-surface-container-lowest border-b border-outline-variant/25 px-4 sm:px-6 flex items-center justify-between gap-3">
      <div className="min-w-0">{left}</div>
      <div className="flex items-center gap-2">{right}</div>
    </header>
  )
}

export default function DashboardShell({
  brandTitle = 'Prabhu Seeds',
  brandSubtitle = 'Agritask Platform',
  navItems = [],
  footer,
  topbar,
  children,
}) {
  return (
    <div className="min-h-screen bg-surface text-on-surface lg:grid lg:grid-cols-[140px_1fr] xl:grid-cols-[220px_1fr]">
      <aside className="hidden lg:flex lg:flex-col bg-surface-container-low border-r border-outline-variant/25">
        <div className="px-4 xl:px-5 py-5 border-b border-outline-variant/20">
          <p className="text-sm xl:text-base font-black font-headline text-primary uppercase tracking-tight">{brandTitle}</p>
          <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.18em] text-on-surface-variant/70">{brandSubtitle}</p>
        </div>

        <nav className="flex-1 py-3 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => (
            <SidebarItem key={`${item.label}-${item.icon}`} item={item} />
          ))}
        </nav>

        {footer ? (
          <div className="px-3 py-4 border-t border-outline-variant/20">{footer}</div>
        ) : null}
      </aside>

      <div className="min-w-0 flex flex-col">
        {topbar}
        <main className="flex-1 px-3 sm:px-5 py-5">{children}</main>
      </div>
    </div>
  )
}
