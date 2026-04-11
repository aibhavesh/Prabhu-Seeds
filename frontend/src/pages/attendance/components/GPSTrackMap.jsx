import { useEffect, useMemo, useRef, useState } from 'react'
import { APIProvider, Map, AdvancedMarker, useMap, useMapsLibrary } from '@vis.gl/react-google-maps'

function Polyline({ path, strokeColor = '#0d631b' }) {
  const map = useMap()
  const maps = useMapsLibrary('maps')
  const polylineRef = useRef(null)

  useEffect(() => {
    if (!map || !maps || !path?.length) return

    if (!polylineRef.current) {
      polylineRef.current = new maps.Polyline({
        map,
        path,
        geodesic: true,
        strokeColor,
        strokeOpacity: 1,
        strokeWeight: 4,
      })
      return
    }

    polylineRef.current.setOptions({ path, strokeColor })
  }, [map, maps, path, strokeColor])

  useEffect(() => {
    return () => {
      polylineRef.current?.setMap(null)
      polylineRef.current = null
    }
  }, [])

  return null
}

function formatClock(timestamp) {
  if (!timestamp) return '--:--'
  const parsed = new Date(timestamp)
  if (Number.isNaN(parsed.getTime())) return '--:--'
  return parsed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const SPEEDS = [1, 2, 5, 10]

export default function GPSTrackMap({ points = [] }) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(2)
  const [index, setIndex] = useState(0)

  const safePoints = useMemo(
    () => points.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng)),
    [points]
  )

  const currentPoint = safePoints[index] ?? safePoints[0]
  const center = currentPoint ?? { lat: 23.2599, lng: 77.4126 }

  useEffect(() => {
    if (!isPlaying || safePoints.length < 2) return

    const interval = window.setInterval(() => {
      setIndex((prev) => {
        if (prev >= safePoints.length - 1) {
          setIsPlaying(false)
          return prev
        }
        return prev + 1
      })
    }, Math.max(120, 700 / speed))

    return () => window.clearInterval(interval)
  }, [isPlaying, safePoints.length, speed])

  const progressPercent = safePoints.length > 1 ? (index / (safePoints.length - 1)) * 100 : 0

  if (!safePoints.length) {
    return (
      <div className="bg-surface-container-lowest p-8 text-center text-on-surface-variant shadow-ghost">
        GPS route data is unavailable for this report.
      </div>
    )
  }

  if (!apiKey) {
    return (
      <div className="bg-surface-container-lowest p-8 text-center text-on-surface-variant shadow-ghost">
        Google Maps API key is missing. Set VITE_GOOGLE_MAPS_API_KEY to enable GPS track replay.
      </div>
    )
  }

  return (
    <div className="bg-surface-container-lowest shadow-ghost overflow-hidden" data-testid="gps-track-map">
      <div className="h-[520px]">
        <APIProvider apiKey={apiKey}>
          <Map
            defaultCenter={center}
            defaultZoom={12}
            mapId={import.meta.env.VITE_GOOGLE_MAP_ID}
            gestureHandling="greedy"
            disableDefaultUI
          >
            <Polyline path={safePoints} />

            <AdvancedMarker position={safePoints[0]}>
              <div className="px-2 py-1 text-[10px] font-black bg-primary text-on-primary">START</div>
            </AdvancedMarker>

            <AdvancedMarker position={safePoints[safePoints.length - 1]}>
              <div className="px-2 py-1 text-[10px] font-black bg-error text-white">END</div>
            </AdvancedMarker>

            <AdvancedMarker position={currentPoint}>
              <div className={`h-4 w-4 rounded-full border-2 border-white bg-primary-container ${isPlaying ? 'animate-pulse' : ''}`} />
            </AdvancedMarker>
          </Map>
        </APIProvider>
      </div>

      <div className="p-4 border-t border-outline-variant/25 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Current Playback</p>
            <p className="text-3xl font-black font-headline text-on-surface">{formatClock(currentPoint?.timestamp)}</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIndex((prev) => Math.max(0, prev - 1))}
              className="h-10 w-10 bg-surface-container-low text-on-surface hover:bg-surface-container"
              aria-label="Step backward"
            >
              <span className="material-symbols-outlined" aria-hidden="true">skip_previous</span>
            </button>
            <button
              type="button"
              onClick={() => setIsPlaying((prev) => !prev)}
              className={`h-10 w-10 bg-primary text-on-primary hover:opacity-90 ${isPlaying ? 'animate-pulse' : ''}`}
              aria-label={isPlaying ? 'Pause replay' : 'Play replay'}
            >
              <span className="material-symbols-outlined" aria-hidden="true">{isPlaying ? 'pause' : 'play_arrow'}</span>
            </button>
            <button
              type="button"
              onClick={() => setIndex((prev) => Math.min(safePoints.length - 1, prev + 1))}
              className="h-10 w-10 bg-surface-container-low text-on-surface hover:bg-surface-container"
              aria-label="Step forward"
            >
              <span className="material-symbols-outlined" aria-hidden="true">skip_next</span>
            </button>
          </div>

          <div className="inline-flex bg-surface-container-low">
            {SPEEDS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSpeed(s)}
                className={`px-3 py-1 text-xs font-bold ${speed === s ? 'bg-primary text-on-primary' : 'text-on-surface-variant'}`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="h-1 bg-surface-container-low relative">
            <div className="h-full bg-primary" style={{ width: `${progressPercent}%` }} />
          </div>
          <div className="mt-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
            <span>{formatClock(safePoints[0]?.timestamp)} (start)</span>
            <span>In progress</span>
            <span>{formatClock(safePoints[safePoints.length - 1]?.timestamp)} (end)</span>
          </div>
        </div>
      </div>
    </div>
  )
}
