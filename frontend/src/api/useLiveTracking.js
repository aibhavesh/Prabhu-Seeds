import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
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

function mergeWaypoint(previousRows, waypoint) {
  const userId = waypoint?.user_id ?? waypoint?.employee_id ?? waypoint?.staff_id
  if (!userId) return previousRows

  const next = [...previousRows]
  const index = next.findIndex((row) => String(row.user_id) === String(userId))

  const patch = {
    user_id: userId,
    name: waypoint?.name,
    department: waypoint?.department,
    state: waypoint?.state,
    assigned_state: waypoint?.assigned_state,
    lat: Number(waypoint?.lat ?? waypoint?.latitude),
    lng: Number(waypoint?.lng ?? waypoint?.longitude),
    accuracy: Number(waypoint?.accuracy ?? waypoint?.gps_accuracy ?? 0),
    last_seen: waypoint?.timestamp ?? waypoint?.created_at ?? new Date().toISOString(),
    current_location: waypoint?.current_location ?? waypoint?.location_name ?? null,
    outside_state: Boolean(waypoint?.outside_state ?? waypoint?.is_outside_state ?? false),
  }

  if (index === -1) {
    next.push({
      ...patch,
      name: patch.name ?? 'Unknown',
      department: patch.department ?? 'Marketing',
      state: patch.state ?? '--',
      assigned_state: patch.assigned_state ?? patch.state ?? '--',
    })
    return next
  }

  const existing = next[index]
  next[index] = {
    ...existing,
    ...patch,
    name: patch.name ?? existing.name,
    department: patch.department ?? existing.department,
    state: patch.state ?? existing.state,
    assigned_state: patch.assigned_state ?? existing.assigned_state,
    lat: Number.isFinite(patch.lat) ? patch.lat : existing.lat,
    lng: Number.isFinite(patch.lng) ? patch.lng : existing.lng,
  }

  return next
}

export function useLiveTracking(options = {}) {
  const {
    pollingIntervalMs = 30_000,
    disableRealtime = false,
    supabaseClient: injectedSupabaseClient,
  } = options

  const [channelStatus, setChannelStatus] = useState('IDLE')
  const [waypointUpdates, setWaypointUpdates] = useState([])
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
    refetchInterval: pollingFallback ? pollingIntervalMs : false,
    placeholderData: (prev) => prev,
  })

  const rows = useMemo(() => {
    const baseRows = normalizeRows(query.data)
    if (!waypointUpdates.length) return baseRows

    return waypointUpdates.reduce((currentRows, waypoint) => mergeWaypoint(currentRows, waypoint), baseRows)
  }, [query.data, waypointUpdates])

  useEffect(() => {
    if (disableRealtime || !supabaseClient) return undefined

    const channel = supabaseClient
      .channel('live-tracking')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'gps_waypoints' },
        (payload) => {
          setWaypointUpdates((prev) => [...prev, payload?.new ?? {}])
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
  }, [supabaseClient, disableRealtime])

  const employees = useMemo(
    () => rows.filter((row) => Number.isFinite(row.lat) && Number.isFinite(row.lng)).map(withDerivedFields),
    [rows]
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
