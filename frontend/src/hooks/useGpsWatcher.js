/**
 * useGpsWatcher — cumulative-distance GPS tracker.
 *
 * Uses navigator.geolocation.watchPosition() (fires on device movement).
 * Before POSTing a waypoint we apply two filters so the DB doesn't get
 * flooded with duplicate coordinates:
 *
 *   1. Cumulative distance gate — accumulates haversine distance between
 *      every raw GPS fix since the last post. Posts when the cumulative
 *      path length exceeds MIN_CUMULATIVE_M. This correctly counts
 *      zig-zag / winding-road travel that a straight-line displacement
 *      gate would miss (the old approach caused ~30-40% distance loss).
 *
 *   2. Heartbeat gate — always post if MIN_HEARTBEAT_MS has elapsed since
 *      the last post, even if the cumulative distance hasn't been reached.
 *      Keeps "last seen" fresh and captures long straight drives.
 *
 * Active only while `enabled` is true (i.e. field staff is checked in).
 * Silently swallows network errors so a bad connection never alerts the user.
 */
import { useEffect, useRef } from 'react'
import apiClient from '@/lib/axios'

const MIN_CUMULATIVE_M  = 50           // post when cumulative path ≥ 50 m
const MIN_HEARTBEAT_MS  = 2 * 60_000  // post at least every 2 minutes

/** Haversine distance in metres between two lat/lng pairs. */
function haversineM(lat1, lng1, lat2, lng2) {
  const R = 6_371_000
  const toRad = (deg) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/**
 * @param {object} params
 * @param {number|null} params.attendanceId  — today's Attendance row id (from /attendance/today)
 * @param {boolean}     params.enabled       — true while the user is checked in
 */
export function useGpsWatcher({ attendanceId, enabled = false }) {
  const lastPostRef      = useRef(null)   // { lat, lng, ts } of last successful post
  const lastFixRef       = useRef(null)   // { lat, lng } of the previous raw GPS fix
  const cumulativeRef    = useRef(0)      // accumulated metres since last post
  const watchIdRef       = useRef(null)

  useEffect(() => {
    if (!enabled || !attendanceId) return
    if (!navigator.geolocation) return

    function handlePosition(pos) {
      const { latitude: lat, longitude: lng, accuracy } = pos.coords

      // Reject clearly invalid coordinates
      if (lat === 0 && lng === 0) return

      // Reject very low-accuracy fixes (> 3 km) — typical of IP-based fallback on laptops
      if (accuracy > 3000) return

      const now = Date.now()

      // Accumulate path distance from the previous raw fix (not from last post)
      if (lastFixRef.current) {
        const legM = haversineM(lastFixRef.current.lat, lastFixRef.current.lng, lat, lng)
        // Only add legs that look like real movement (> 2 m) to filter GPS jitter
        if (legM > 2) {
          cumulativeRef.current += legM
        }
      }
      lastFixRef.current = { lat, lng }

      const last = lastPostRef.current
      const heartbeat = last ? now - last.ts >= MIN_HEARTBEAT_MS : true
      const distanceMet = cumulativeRef.current >= MIN_CUMULATIVE_M

      if (!distanceMet && !heartbeat) return  // neither condition met → skip

      // Optimistically update refs before the request so rapid fixes don't
      // trigger duplicate posts while the first one is still in flight.
      const prevPost = lastPostRef.current
      lastPostRef.current = { lat, lng, ts: now }
      cumulativeRef.current = 0  // reset accumulator

      apiClient
        .post('/api/v1/attendance/waypoints', {
          attendance_id: attendanceId,
          lat,
          lng,
          accuracy: Math.round(accuracy),
          timestamp: new Date(now).toISOString(),
          type: 'stop',
        })
        .catch(() => {
          // Network failure — revert so the next fix retries
          lastPostRef.current = prevPost
          // Re-add the cumulative distance we cleared so it's not lost
          if (lastFixRef.current) {
            cumulativeRef.current += haversineM(lat, lng, lastFixRef.current.lat, lastFixRef.current.lng)
          }
        })
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      handlePosition,
      null, // errors are non-fatal; GPS unavailable just means no waypoints
      {
        enableHighAccuracy: true,
        maximumAge: 10_000,  // accept a cached fix up to 10 s old (was 30 s)
        timeout: 15_000,
      },
    )

    return () => {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
      lastPostRef.current   = null
      lastFixRef.current    = null
      cumulativeRef.current = 0
    }
  }, [enabled, attendanceId])
}
