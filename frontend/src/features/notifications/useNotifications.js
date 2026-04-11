import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/axios'

const NOTIFICATIONS_QUERY_KEY = ['notifications', 'unread']

function normalizeNotifications(payload) {
  const rows = payload?.notifications ?? payload?.items ?? payload?.data ?? payload ?? []
  if (!Array.isArray(rows)) return []

  return rows.map((row, idx) => ({
    id: row.id ?? row.notification_id ?? `notification-${idx}`,
    type: row.type ?? 'task_assigned',
    message: row.message ?? row.title ?? 'Notification',
    created_at: row.created_at ?? row.createdAt ?? new Date().toISOString(),
    // Backend returns read_at: datetime|null; also handle legacy is_read/read fields
    is_read: row.read_at != null || Boolean(row.is_read ?? row.read ?? false),
    target_url: row.target_url ?? row.route ?? null,
    meta: row.meta ?? {},
  }))
}

export function resolveNotificationRoute(notification) {
  if (notification?.target_url) return notification.target_url

  switch (notification?.type) {
    case 'task_assigned':
      return '/tasks'
    case 'leave_approved':
      return '/leave'
    case 'travel_claim_status':
      return '/travel'
    default:
      return '/dashboard/field'
  }
}

export default function useNotifications({ enabled = true } = {}) {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: NOTIFICATIONS_QUERY_KEY,
    enabled,
    queryFn: () =>
      apiClient
        .get('/api/v1/notifications', { params: { unread: true } })
        .then((res) => normalizeNotifications(res.data)),
    refetchInterval: 60_000,
    placeholderData: (prev) => prev,
  })

  const markAsRead = useMutation({
    mutationFn: (notificationId) =>
      apiClient.patch(`/api/v1/notifications/${notificationId}/read`).then((res) => res.data),
    onMutate: async (notificationId) => {
      await queryClient.cancelQueries({ queryKey: NOTIFICATIONS_QUERY_KEY })

      const previous = queryClient.getQueryData(NOTIFICATIONS_QUERY_KEY)

      queryClient.setQueryData(NOTIFICATIONS_QUERY_KEY, (current) => {
        if (!Array.isArray(current)) return current
        return current.map((item) =>
          String(item.id) === String(notificationId)
            ? { ...item, is_read: true }
            : item
        )
      })

      return { previous }
    },
    onError: (_error, _notificationId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(NOTIFICATIONS_QUERY_KEY, context.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY })
    },
  })

  const notifications = query.data ?? []
  const unreadCount = notifications.filter((n) => !n.is_read).length

  return {
    notifications,
    unreadCount,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    markAsRead: markAsRead.mutateAsync,
    isMarkingAsRead: markAsRead.isPending,
  }
}
