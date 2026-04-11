import DashboardShell, { DashboardTopbar } from '@/components/layout/DashboardShell'
import NotificationBell from '@/features/notifications/NotificationBell'

/**
 * Thin wrapper around DashboardShell for leave pages.
 * The sidebar is fully managed by DashboardShell (role-aware).
 */
export default function LeaveShell({ title, subtitle, rightSlot = null, children }) {
  return (
    <DashboardShell
      topbar={
        <DashboardTopbar
          left={
            <div>
              <h1 className="text-2xl font-black font-headline tracking-tight text-on-surface leading-none">
                {title}
              </h1>
              {subtitle && (
                <p className="text-on-surface-variant mt-0.5 font-medium text-xs">{subtitle}</p>
              )}
            </div>
          }
          right={
            <>
              {rightSlot}
              <NotificationBell />
            </>
          }
        />
      }
    >
      {children}
    </DashboardShell>
  )
}
