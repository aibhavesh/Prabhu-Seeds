import { useCallback, useEffect, useRef, useState } from 'react'

const STORAGE_KEY = 'travel_journey_active'

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
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function persistJourney(state) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // ignore storage errors
  }
}

function clearPersistedJourney() {
  sessionStorage.removeItem(STORAGE_KEY)
}

export default function useTravelJourney() {
  const persisted = loadPersistedJourney()

  const [active, setActive] = useState(!!persisted)
  const [startTime, setStartTime] = useState(persisted?.startTime ?? null)
  const [totalKm, setTotalKm] = useState(persisted?.totalKm ?? 0)
  const [elapsed, setElapsed] = useState(0)
  const [gpsError, setGpsError] = useState(null)

  const watchIdRef = useRef(null)
  const lastPosRef = useRef(persisted?.lastPos ?? null)
  const totalKmRef = useRef(persisted?.totalKm ?? 0)

  // Live elapsed timer
  useEffect(() => {
    if (!active || !startTime) return
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000))
    }, 1000)
    return () => clearInterval(id)
  }, [active, startTime])

  const startWatching = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsError('GPS not available on this device.')
      return
    }
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords
        setGpsError(null)
        if (lastPosRef.current) {
          const delta = haversineKm(
            lastPosRef.current.lat,
            lastPosRef.current.lng,
            lat,
            lng,
          )
          // ignore jitter < 0.01 km (10 m)
          if (delta >= 0.01) {
            totalKmRef.current = totalKmRef.current + delta
            setTotalKm(totalKmRef.current)
            lastPosRef.current = { lat, lng }
            // update persisted km so refresh doesn't lose distance
            persistJourney({
              startTime,
              totalKm: totalKmRef.current,
              lastPos: { lat, lng },
            })
          }
        } else {
          lastPosRef.current = { lat, lng }
        }
      },
      (err) => {
        setGpsError(`GPS error: ${err.message}`)
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 30000 },
    )
  }, [startTime])

  const start = useCallback(() => {
    const now = Date.now()
    setActive(true)
    setStartTime(now)
    setTotalKm(0)
    setElapsed(0)
    totalKmRef.current = 0
    lastPosRef.current = null
    persistJourney({ startTime: now, totalKm: 0, lastPos: null })
    // get initial position
    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        lastPosRef.current = { lat: pos.coords.latitude, lng: pos.coords.longitude }
      },
      () => {},
      { enableHighAccuracy: true, timeout: 15000 },
    )
  }, [])

  const stop = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation?.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    setActive(false)
    clearPersistedJourney()
  }, [])

  // Resume watching on mount if journey was active
  useEffect(() => {
    if (active && startTime) startWatching()
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation?.clearWatch(watchIdRef.current)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Start watching once start() sets active=true
  useEffect(() => {
    if (active && watchIdRef.current === null && startTime) {
      startWatching()
    }
  }, [active, startTime, startWatching])

  return {
    active,
    startTime,
    totalKm,
    elapsed,
    gpsError,
    start,
    stop,
  }
}
