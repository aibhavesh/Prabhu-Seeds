import { useCallback, useEffect, useRef, useState } from 'react'

const STORAGE_KEY = 'travel_journey_active'
const MIN_DELTA_KM = 0.01  // ignore GPS jitter < 10 m

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function loadPersistedJourney() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    // Validate shape before trusting it
    if (
      typeof parsed?.startTime !== 'number' ||
      typeof parsed?.totalKm !== 'number'
    ) return null
    return parsed
  } catch {
    return null
  }
}

function persistJourney(state) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // storage unavailable — ignore
  }
}

function clearPersistedJourney() {
  try { sessionStorage.removeItem(STORAGE_KEY) } catch { /* ignore */ }
}

export default function useTravelJourney() {
  const persisted = loadPersistedJourney()

  const [active, setActive]       = useState(!!persisted)
  const [startTime, setStartTime] = useState(persisted?.startTime ?? null)
  const [totalKm, setTotalKm]     = useState(persisted?.totalKm ?? 0)
  const [elapsed, setElapsed]     = useState(0)
  const [gpsError, setGpsError]   = useState(null)

  const watchIdRef   = useRef(null)
  const lastPosRef   = useRef(persisted?.lastPos ?? null)
  const totalKmRef   = useRef(persisted?.totalKm ?? 0)
  // Store startTime in a ref too — safe to read inside GPS callback without stale closure risk
  const startTimeRef = useRef(persisted?.startTime ?? null)

  // ── Live elapsed timer ────────────────────────────────────────────────────
  useEffect(() => {
    if (!active || !startTimeRef.current) return
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000))
    }, 1000)
    return () => clearInterval(id)
  }, [active])

  // ── GPS watch ─────────────────────────────────────────────────────────────
  const startWatching = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsError('GPS not available on this device.')
      return
    }
    // Prevent double-watch
    if (watchIdRef.current !== null) return

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords
        setGpsError(null)

        if (lastPosRef.current) {
          const delta = haversineKm(lastPosRef.current.lat, lastPosRef.current.lng, lat, lng)
          if (delta >= MIN_DELTA_KM) {
            totalKmRef.current += delta
            setTotalKm(totalKmRef.current)
            lastPosRef.current = { lat, lng }
            persistJourney({
              startTime: startTimeRef.current,
              totalKm: totalKmRef.current,
              lastPos: { lat, lng },
            })
          }
        } else {
          lastPosRef.current = { lat, lng }
          persistJourney({
            startTime: startTimeRef.current,
            totalKm: totalKmRef.current,
            lastPos: { lat, lng },
          })
        }
      },
      (err) => setGpsError(`GPS error: ${err.message}`),
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 30_000 },
    )
  }, []) // no deps — reads everything from refs, never stale

  // ── Start ─────────────────────────────────────────────────────────────────
  const start = useCallback(() => {
    const now = Date.now()

    // Reset refs synchronously before setting state
    totalKmRef.current  = 0
    lastPosRef.current  = null
    startTimeRef.current = now

    setActive(true)
    setStartTime(now)
    setTotalKm(0)
    setElapsed(0)
    setGpsError(null)

    persistJourney({ startTime: now, totalKm: 0, lastPos: null })

    // Grab initial position
    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        lastPosRef.current = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        persistJourney({ startTime: now, totalKm: 0, lastPos: lastPosRef.current })
      },
      () => {},
      { enableHighAccuracy: true, timeout: 15_000 },
    )

    startWatching()
  }, [startWatching])

  // ── Stop ──────────────────────────────────────────────────────────────────
  const stop = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation?.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    setActive(false)
    clearPersistedJourney()
  }, [])

  // ── Resume GPS watch on mount if journey was persisted ────────────────────
  useEffect(() => {
    if (persisted && active) {
      startWatching()
    }
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation?.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // intentionally run once on mount only

  return { active, startTime, totalKm, elapsed, gpsError, start, stop }
}
