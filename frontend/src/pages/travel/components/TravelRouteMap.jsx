import { useMemo } from 'react'
import { format } from 'date-fns'
import { Map, AdvancedMarker } from '@vis.gl/react-google-maps'
import GoogleMapProvider from '@/components/maps/GoogleMapProvider'
import GooglePolyline from '@/components/maps/GooglePolyline'
import MapLoadingSkeleton from '@/components/maps/MapLoadingSkeleton'
import { useTravelRoute } from '../hooks/useTravel'

function boundingCenter(points) {
  if (!points.length) return { lat: 23.2599, lng: 77.4126 } // India centre fallback
  const lat = points.reduce((s, p) => s + p.lat, 0) / points.length
  const lng = points.reduce((s, p) => s + p.lng, 0) / points.length
  return { lat, lng }
}

function haversineKm(a, b) {
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const sin2 = (x) => Math.sin(x / 2) ** 2
  const c = 2 * Math.atan2(
    Math.sqrt(sin2(dLat) + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * sin2(dLng)),
    Math.sqrt(1 - sin2(dLat) - Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * sin2(dLng)),
  )
  return R * c
}

function totalKm(points) {
  let km = 0
  for (let i = 1; i < points.length; i++) km += haversineKm(points[i - 1], points[i])
  return km
}

export default function TravelRouteMap({ expenseId, heightClass = 'h-[420px]' }) {
  const { data, isLoading, isError } = useTravelRoute(expenseId)

  const path = useMemo(() => {
    if (!Array.isArray(data) || !data.length) return []
    return data.map((w) => ({ lat: Number(w.lat), lng: Number(w.lng) }))
  }, [data])

  const center = useMemo(() => boundingCenter(path), [path])

  const startPoint = path[0] ?? null
  const endPoint = path.length > 1 ? path[path.length - 1] : null

  const startTime = data?.[0]?.timestamp
  const endTime = data?.[data.length - 1]?.timestamp

  const distanceKm = useMemo(() => (path.length > 1 ? totalKm(path) : 0), [path])

  if (isLoading) {
    return <MapLoadingSkeleton heightClass={heightClass} label="Loading route..." />
  }

  if (isError) {
    return (
      <div className={`w-full ${heightClass} bg-surface-container-low text-error flex items-center justify-center text-sm font-semibold`}>
        Failed to load route data.
      </div>
    )
  }

  if (!path.length) {
    return (
      <div className={`w-full ${heightClass} bg-surface-container-low text-on-surface-variant flex items-center justify-center text-sm`}>
        No GPS waypoints recorded for this journey.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className={`${heightClass} bg-surface-container-lowest overflow-hidden`}>
        <GoogleMapProvider fallbackClassName={heightClass}>
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
                  START
                </div>
              </AdvancedMarker>
            )}

            {endPoint && (
              <AdvancedMarker position={endPoint}>
                <div className="h-7 w-7 rounded-full bg-error border-2 border-white shadow-md flex items-center justify-center text-[9px] font-black text-white">
                  END
                </div>
              </AdvancedMarker>
            )}
          </Map>
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
