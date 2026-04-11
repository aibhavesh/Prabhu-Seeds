import { Link } from 'react-router-dom'
import DashboardShell, { DashboardTopbar } from '@/components/layout/DashboardShell'
import NotificationBell from '@/features/notifications/NotificationBell'

/**
 * Thin wrapper around DashboardShell for attendance pages.
 * The sidebar is fully managed by DashboardShell (role-aware).
 */
export default function AttendanceShell({ crumbs = [], rightSlot = null, children }) {
  return (
    <DashboardShell
      topbar={
        <DashboardTopbar
          left={
            <div className="flex items-center gap-2 text-sm text-on-surface-variant min-w-0">
              <Link to="/attendance" className="font-bold text-primary whitespace-nowrap">
                PGA AgriTask
              </Link>
              {crumbs.map((crumb) => (
                <span key={crumb} className="truncate">/ {crumb}</span>
              ))}
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
