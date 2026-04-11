import { useEffect, useMemo, useState } from 'react'
import { Map, AdvancedMarker } from '@vis.gl/react-google-maps'
import GoogleMapProvider from './GoogleMapProvider'
import GooglePolyline from './GooglePolyline'
import MapLoadingSkeleton from './MapLoadingSkeleton'

function formatTimestamp(value) {
  if (!value) return '--'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleString([], {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function routeCenter(waypoints) {
  if (!waypoints.length) return { lat: 23.2599, lng: 77.4126 }

  const totals = waypoints.reduce(
    (acc, point) => ({ lat: acc.lat + point.lat, lng: acc.lng + point.lng }),
    { lat: 0, lng: 0 }
  )

  return {
    lat: totals.lat / waypoints.length,
    lng: totals.lng / waypoints.length,
  }
}

export default function GPSTrackReplay({ waypoints = [], isLoading = false, heightClass = 'h-[420px]' }) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [index, setIndex] = useState(0)

  const points = useMemo(
    () =>
      (waypoints ?? [])
        .map((point) => ({
          lat: Number(point.lat),
          lng: Number(point.lng),
          timestamp: point.timestamp,
        }))
        .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng)),
    [waypoints]
  )

  useEffect(() => {
    if (!isPlaying || points.length < 2) return

    const id = window.setInterval(() => {
      setIndex((prev) => {
        if (prev >= points.length - 1) {
          setIsPlaying(false)
          return prev
        }
        return prev + 1
      })
    }, 500)

    return () => window.clearInterval(id)
  }, [isPlaying, points.length])

  if (isLoading) {
    return <MapLoadingSkeleton heightClass={heightClass} label="Loading GPS replay..." />
  }

  if (!points.length) {
    return (
      <div className={`w-full ${heightClass} bg-surface-container-low text-on-surface-variant flex items-center justify-center text-sm`}>
        No GPS waypoints available.
      </div>
    )
  }

  const safeIndex = Math.min(index, Math.max(0, points.length - 1))
  const current = points[safeIndex]
  const progress = points.length > 1 ? (safeIndex / (points.length - 1)) * 100 : 0

  return (
    <div className="space-y-3">
      <div className={`${heightClass} bg-surface-container-lowest shadow-ghost overflow-hidden`}>
        <GoogleMapProvider fallbackClassName={heightClass}>
          <Map
            defaultCenter={routeCenter(points)}
            defaultZoom={12}
            disableDefaultUI
            gestureHandling="greedy"
            mapId={import.meta.env.VITE_GOOGLE_MAP_ID}
          >
            <GooglePolyline path={points} strokeColor="#006a63" />

            <AdvancedMarker position={points[0]}>
              <div className="px-2 py-1 bg-primary text-on-primary text-[10px] font-black">START</div>
            </AdvancedMarker>

            <AdvancedMarker position={points[points.length - 1]}>
              <div className="px-2 py-1 bg-error text-white text-[10px] font-black">END</div>
            </AdvancedMarker>

            <AdvancedMarker position={current}>
              <div className={`h-4 w-4 rounded-full border-2 border-white bg-primary-container ${isPlaying ? 'animate-pulse' : ''}`} />
            </AdvancedMarker>
          </Map>
        </GoogleMapProvider>
      </div>

      <div className="bg-surface-container-lowest shadow-ghost p-3 space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Current Timestamp</p>
            <p className="text-sm font-semibold text-on-surface">{formatTimestamp(current.timestamp)}</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setIsPlaying(false)
                setIndex(0)
              }}
              className="px-3 py-1.5 bg-surface-container-low text-xs font-bold uppercase tracking-widest text-on-surface-variant"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={() => setIsPlaying((prev) => !prev)}
              className={`px-3 py-1.5 text-xs font-bold uppercase tracking-widest ${
                isPlaying ? 'bg-error text-white' : 'bg-primary text-on-primary'
              }`}
            >
              {isPlaying ? 'Pause' : 'Play'}
            </button>
          </div>
        </div>

        <div className="h-2 bg-surface-container-low relative overflow-hidden">
          <div className="h-full bg-primary transition-[width] duration-200" style={{ width: `${progress}%` }} />
        </div>
      </div>
    </div>
  )
}
