import { useMemo } from 'react'
import { format } from 'date-fns'
import { Map, AdvancedMarker, useApiLoadingStatus } from '@vis.gl/react-google-maps'
import GoogleMapProvider from '@/components/maps/GoogleMapProvider'
import GooglePolyline from '@/components/maps/GooglePolyline'
import { useTravelRoute } from '../hooks/useTravel'

const MIN_ROUTE_KM = 1 // routes shorter than this are treated as "no meaningful data"

function boundingCenter(points) {
  if (!points.length) return { lat: 23.2599, lng: 77.4126 }
  const lat = points.reduce((s, p) => s + p.lat, 0) / points.length
  const lng = points.reduce((s, p) => s + p.lng, 0) / points.length
  return { lat, lng }
}

function haversineKm(a, b) {
  const R = 6371
  const toRad = (x) => (x * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
}

function totalKm(points) {
  let km = 0
  for (let i = 1; i < points.length; i++) km += haversineKm(points[i - 1], points[i])
  return km
}

function NoRouteMessage({ heightClass, reason }) {
  return (
    <div className={`w-full ${heightClass} bg-surface-container-low flex flex-col items-center justify-center gap-2`}>
      <span className="material-symbols-outlined text-3xl text-on-surface-variant/40" aria-hidden="true">location_off</span>
      <p className="text-sm font-semibold text-on-surface-variant">No route data available.</p>
      <p className="text-xs text-on-surface-variant/60">{reason}</p>
    </div>
  )
}

/**
 * Must be rendered inside GoogleMapProvider (inside APIProvider) so it can
 * call useApiLoadingStatus to detect a missing / invalid API key.
 */
function MapCanvas({ path, startPoint, endPoint, center, heightClass }) {
  const status = useApiLoadingStatus()

  if (status === 'FAILED') {
    return (
      <NoRouteMessage
        heightClass={heightClass}
        reason="Google Maps could not be loaded. Check the API key configuration."
      />
    )
  }

  if (status === 'LOADING' || status === 'NOT_LOADED') {
    return (
      <div className={`w-full ${heightClass} bg-surface-container-low flex items-center justify-center gap-2 text-sm text-on-surface-variant`}>
        <span className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        Loading map…
      </div>
    )
  }

  return (
    <Map
      defaultCenter={center}
      defaultZoom={12}
      disableDefaultUI
      gestureHandling="greedy"
      mapId={import.meta.env.VITE_GOOGLE_MAP_ID}
    >
      <GooglePolyline path={path} strokeColor="#0d631b" strokeWeight={4} />

      {startPoint && (
        <AdvancedMarker position={startPoint}>
          <div className="h-7 w-7 rounded-full bg-primary border-2 border-white shadow-md flex items-center justify-center text-[9px] font-black text-white">
            A
          </div>
        </AdvancedMarker>
      )}

      {endPoint && (
        <AdvancedMarker position={endPoint}>
          <div className="h-7 w-7 rounded-full bg-error border-2 border-white shadow-md flex items-center justify-center text-[9px] font-black text-white">
            B
          </div>
        </AdvancedMarker>
      )}
    </Map>
  )
}

export default function TravelRouteMap({ expenseId, heightClass = 'h-[420px]' }) {
  const { data, isLoading } = useTravelRoute(expenseId)

  const path = useMemo(() => {
    if (!Array.isArray(data) || !data.length) return []
    return data.map((w) => ({ lat: Number(w.lat), lng: Number(w.lng) }))
  }, [data])

  const distanceKm = useMemo(() => (path.length > 1 ? totalKm(path) : 0), [path])
  const center = useMemo(() => boundingCenter(path), [path])

  const startPoint = path[0] ?? null
  const endPoint = path.length > 1 ? path[path.length - 1] : null
  const startTime = data?.[0]?.timestamp
  const endTime = data?.[data.length - 1]?.timestamp

  // ── 1. Still fetching ────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className={`w-full ${heightClass} bg-surface-container-low flex items-center justify-center gap-2 text-sm text-on-surface-variant`}>
        <span className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        Checking for route data…
      </div>
    )
  }

  // ── 2. No waypoints recorded ─────────────────────────────────────────────
  if (!path.length) {
    return (
      <NoRouteMessage
        heightClass={heightClass}
        reason="GPS waypoints were not recorded on this journey day."
      />
    )
  }

  // ── 3. Journey too short to be meaningful ────────────────────────────────
  if (distanceKm < MIN_ROUTE_KM) {
    return (
      <NoRouteMessage
        heightClass={heightClass}
        reason={`Total distance (${(distanceKm * 1000).toFixed(0)} m) is under 1 km — no meaningful route to display.`}
      />
    )
  }

  // ── 4. Render map ────────────────────────────────────────────────────────
  return (
    <div className="space-y-3">
      <div className={`${heightClass} bg-surface-container-lowest overflow-hidden`}>
        <GoogleMapProvider fallbackClassName={heightClass}>
          <MapCanvas
            path={path}
            startPoint={startPoint}
            endPoint={endPoint}
            center={center}
            heightClass={heightClass}
          />
        </GoogleMapProvider>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <span className="px-3 py-1.5 bg-surface-container-low text-xs font-bold uppercase tracking-widest text-on-surface-variant">
          Distance: {distanceKm.toFixed(1)} km
        </span>
        <span className="px-3 py-1.5 bg-surface-container-low text-xs font-bold uppercase tracking-widest text-on-surface-variant">
          Waypoints: {path.length}
        </span>
        {startTime && (
          <span className="px-3 py-1.5 bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest">
            {format(new Date(startTime), 'hh:mm a')} → {endTime ? format(new Date(endTime), 'hh:mm a') : '--'}
          </span>
        )}
      </div>
    </div>
  )
}
