import { useMemo, useState } from 'react'
import * as Popover from '@radix-ui/react-popover'
import { formatDistanceToNow } from 'date-fns'
import { useNavigate } from 'react-router-dom'
import useNotifications, { resolveNotificationRoute } from './useNotifications'

const TYPE_META = {
  task_assigned: {
    icon: 'content_paste',
    iconClass: 'text-primary',
  },
  leave_approved: {
    icon: 'calendar_month',
    iconClass: 'text-blue-700',
  },
  travel_claim_status: {
    icon: 'payments',
    iconClass: 'text-amber-700',
  },
}

function notificationMeta(type) {
  return TYPE_META[type] ?? {
    icon: 'notifications',
    iconClass: 'text-on-surface-variant',
  }
}

function NotificationRow({ notification, onClick }) {
  const meta = notificationMeta(notification.type)
  const createdAt = notification.created_at ? new Date(notification.created_at) : null

  return (
    <button
      type="button"
      onClick={() => onClick(notification)}
      className="w-full text-left px-3 py-2 hover:bg-surface-container-low transition-colors border-b border-outline-variant/10"
    >
      <div className="flex items-start gap-3">
        <span className={`material-symbols-outlined text-[18px] mt-0.5 ${meta.iconClass}`} aria-hidden="true">
          {meta.icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-on-surface font-medium leading-snug">{notification.message}</p>
          <p className="text-xs text-on-surface-variant mt-1">
            {createdAt && !Number.isNaN(createdAt.getTime())
              ? formatDistanceToNow(createdAt, { addSuffix: true })
              : 'Just now'}
          </p>
        </div>
      </div>
    </button>
  )
}

export default function NotificationBell({ limit = 10, className = '' }) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    isMarkingAsRead,
  } = useNotifications()

  const latestNotifications = useMemo(
    () => notifications.slice(0, limit),
    [notifications, limit]
  )

  async function handleNotificationClick(notification) {
    if (!notification.is_read) {
      try {
        await markAsRead(notification.id)
      } catch {
        // Continue navigation even if mark-as-read fails
      }
    }

    const route = resolveNotificationRoute(notification)
    setOpen(false)
    navigate(route)
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className={`relative h-8 w-8 flex items-center justify-center text-on-surface-variant hover:bg-surface-container-low ${className}`}
          aria-label="Notifications"
        >
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">notifications</span>
          {unreadCount > 0 && (
            <>
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-error text-white text-[10px] font-bold leading-4 text-center">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
              <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-error ring-2 ring-white" />
            </>
          )}
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          className="z-50 w-[340px] bg-surface-container-lowest shadow-ghost border border-outline-variant/20 p-0"
          sideOffset={8}
          align="end"
        >
          <div className="px-3 py-2 border-b border-outline-variant/20">
            <p className="text-sm font-black font-headline text-on-surface">Notifications</p>
            <p className="text-xs text-on-surface-variant">Unread: {unreadCount}</p>
          </div>

          <div className="max-h-[360px] overflow-y-auto">
            {isLoading && (
              <div className="p-3 space-y-2 animate-pulse">
                {Array.from({ length: 4 }).map((_, idx) => (
                  <div key={idx} className="h-12 bg-surface-container-low" />
                ))}
              </div>
            )}

            {!isLoading && latestNotifications.length === 0 && (
              <div className="px-3 py-8 text-center text-sm text-on-surface-variant">
                No unread notifications.
              </div>
            )}

            {!isLoading && latestNotifications.map((notification) => (
              <NotificationRow
                key={notification.id}
                notification={notification}
                onClick={handleNotificationClick}
              />
            ))}
          </div>

          <div className="px-3 py-2 border-t border-outline-variant/20 text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">
            {isMarkingAsRead ? 'Updating...' : `Showing last ${Math.min(limit, latestNotifications.length)} notifications`}
          </div>

          <Popover.Arrow className="fill-surface-container-lowest" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
