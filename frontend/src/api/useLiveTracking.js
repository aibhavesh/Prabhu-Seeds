import { useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@supabase/supabase-js'
import apiClient from '@/lib/axios'
import { withDerivedFields } from '@/pages/tracking/utils/liveTrackingFilters'

function normalizeRows(payload) {
  const rows = payload?.employees ?? payload?.items ?? payload?.data ?? payload ?? []
  if (!Array.isArray(rows)) return []

  return rows.map((row, idx) => ({
    user_id: row.user_id ?? row.id ?? `user-${idx}`,
    name: row.name ?? row.staff_name ?? 'Unknown',
    department: row.department ?? 'Marketing',
    state: row.state ?? row.region ?? '--',
    assigned_state: row.assigned_state ?? row.assignedState ?? row.state ?? '--',
    lat: Number(row.lat ?? row.latitude),
    lng: Number(row.lng ?? row.longitude),
    accuracy: Number(row.accuracy ?? row.gps_accuracy ?? 0),
    last_seen: row.last_seen ?? row.timestamp ?? row.created_at ?? null,
    current_location: row.current_location ?? row.location_name ?? null,
    outside_state: Boolean(row.outside_state ?? row.is_outside_state ?? false),
  }))
}


export function useLiveTracking(options = {}) {
  const {
    pollingIntervalMs = 30_000,
    disableRealtime = false,
    supabaseClient: injectedSupabaseClient,
  } = options

  const queryClient = useQueryClient()
  const [channelStatus, setChannelStatus] = useState('IDLE')
  const [lastRealtimeEventAt, setLastRealtimeEventAt] = useState(null)

  const supabaseClient = useMemo(() => {
    if (injectedSupabaseClient) return injectedSupabaseClient

    const url = import.meta.env.VITE_SUPABASE_URL
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
    if (!url || !anonKey) return null

    return createClient(url, anonKey)
  }, [injectedSupabaseClient])

  const realtimeStatus = disableRealtime
    ? 'DISABLED'
    : !supabaseClient
    ? 'MISSING_CONFIG'
    : channelStatus

  const isRealtimeConnected = realtimeStatus === 'SUBSCRIBED'
  const pollingFallback =
    disableRealtime ||
    !supabaseClient ||
    realtimeStatus === 'IDLE' ||
    realtimeStatus === 'CONNECTING' ||
    realtimeStatus === 'CHANNEL_ERROR' ||
    realtimeStatus === 'CLOSED' ||
    realtimeStatus === 'TIMED_OUT'

  const query = useQuery({
    queryKey: ['tracking-live'],
    queryFn: () => apiClient.get('/api/v1/tracking/live').then((res) => res.data),
    // Poll when realtime is not connected; pause polling when realtime is active
    // (realtime invalidates the query directly on each new waypoint INSERT)
    refetchInterval: pollingFallback ? pollingIntervalMs : false,
    placeholderData: (prev) => prev,
  })

  useEffect(() => {
    if (disableRealtime || !supabaseClient) return undefined

    const channel = supabaseClient
      .channel('live-tracking')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'gps_waypoints' },
        () => {
          // Invalidate so the query re-fetches with fresh employee positions.
          // This is simpler and correct vs. trying to merge a gps_waypoints row
          // (which lacks user_id and can't be matched to an employee directly).
          queryClient.invalidateQueries({ queryKey: ['tracking-live'] })
          setLastRealtimeEventAt(new Date().toISOString())
        }
      )
      .subscribe((status) => {
        setChannelStatus(status)
      })

    return () => {
      if (supabaseClient.removeChannel) {
        supabaseClient.removeChannel(channel)
      } else {
        channel.unsubscribe?.()
      }
    }
  }, [supabaseClient, disableRealtime, queryClient])

  const rows = useMemo(() => normalizeRows(query.data), [query.data])

  const employees = useMemo(
    () =>
      rows
        .filter(
          (row) =>
            Number.isFinite(row.lat) &&
            Number.isFinite(row.lng) &&
            // Exclude employees whose only recorded position is the (0, 0) sentinel
            // value that gets saved when GPS is unavailable at check-in time.
            !(row.lat === 0 && row.lng === 0),
        )
        .map(withDerivedFields),
    [rows],
  )

  return {
    employees,
    isLoading: query.isLoading && employees.length === 0,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    isRealtimeConnected,
    realtimeStatus,
    isPollingFallback: pollingFallback,
    lastRealtimeEventAt,
  }
}

export default useLiveTracking
