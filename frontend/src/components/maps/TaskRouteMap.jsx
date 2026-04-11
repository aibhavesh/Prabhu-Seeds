import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Map, AdvancedMarker } from '@vis.gl/react-google-maps'
import apiClient from '@/lib/axios'
import GoogleMapProvider from './GoogleMapProvider'
import GooglePolyline from './GooglePolyline'
import MapLoadingSkeleton from './MapLoadingSkeleton'

function decodePolyline(encoded) {
  if (!encoded || typeof encoded !== 'string') return []

  const points = []
  let index = 0
  let lat = 0
  let lng = 0

  while (index < encoded.length) {
    let shift = 0
    let result = 0
    let byte

    do {
      byte = encoded.charCodeAt(index) - 63
      index += 1
      result |= (byte & 0x1f) << shift
      shift += 5
    } while (byte >= 0x20)

    const deltaLat = result & 1 ? ~(result >> 1) : result >> 1
    lat += deltaLat

    shift = 0
    result = 0

    do {
      byte = encoded.charCodeAt(index) - 63
      index += 1
      result |= (byte & 0x1f) << shift
      shift += 5
    } while (byte >= 0x20)

    const deltaLng = result & 1 ? ~(result >> 1) : result >> 1
    lng += deltaLng

    points.push({ lat: lat / 1e5, lng: lng / 1e5 })
  }

  return points
}

function normalizeDirectionPayload(payload, origin, destination) {
  const route = payload?.route ?? payload?.data ?? payload
  const encoded = route?.polyline ?? route?.overview_polyline?.points
  const decodedPath = decodePolyline(encoded)

  const coordinates = route?.coordinates ?? route?.path ?? route?.points ?? []
  const rawPath = Array.isArray(coordinates)
    ? coordinates
        .map((p) => ({
          lat: Number(p.lat ?? p.latitude),
          lng: Number(p.lng ?? p.longitude),
        }))
        .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng))
    : []

  const path = decodedPath.length ? decodedPath : rawPath.length ? rawPath : [origin, destination].filter(Boolean)

  return {
    path,
    distanceText: route?.distance_text ?? route?.distance?.text ?? route?.distance ?? '--',
    etaText: route?.duration_text ?? route?.duration?.text ?? route?.eta ?? '--',
  }
}

function midpoint(origin, destination) {
  if (!origin && !destination) return { lat: 23.2599, lng: 77.4126 }
  if (!origin) return destination
  if (!destination) return origin

  return {
    lat: (origin.lat + destination.lat) / 2,
    lng: (origin.lng + destination.lng) / 2,
  }
}

export default function TaskRouteMap({ origin, destination, heightClass = 'h-80' }) {
  const hasPoints = Number.isFinite(origin?.lat) && Number.isFinite(origin?.lng) && Number.isFinite(destination?.lat) && Number.isFinite(destination?.lng)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['maps-directions', origin, destination],
    enabled: hasPoints,
    queryFn: () =>
      apiClient
        .get('/api/v1/maps/directions', {
          params: {
            origin: `${origin.lat},${origin.lng}`,
            destination: `${destination.lat},${destination.lng}`,
          },
        })
        .then((res) => res.data),
  })

  const directions = useMemo(
    () => normalizeDirectionPayload(data, origin, destination),
    [data, origin, destination]
  )

  const center = midpoint(origin, destination)

  if (!hasPoints) {
    return (
      <div className={`w-full ${heightClass} bg-surface-container-low text-on-surface-variant flex items-center justify-center text-sm`}>
        Route coordinates unavailable.
      </div>
    )
  }

  if (isLoading) {
    return <MapLoadingSkeleton heightClass={heightClass} label="Loading route..." />
  }

  if (isError) {
    return (
      <div className={`w-full ${heightClass} bg-surface-container-low text-error flex items-center justify-center text-sm`}>
        Failed to load route directions.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className={`${heightClass} bg-surface-container-lowest shadow-ghost overflow-hidden`}>
        <GoogleMapProvider fallbackClassName={heightClass}>
          <Map
            defaultCenter={center}
            defaultZoom={12}
            disableDefaultUI
            gestureHandling="greedy"
            mapId={import.meta.env.VITE_GOOGLE_MAP_ID}
          >
            <GooglePolyline path={directions.path} />

            <AdvancedMarker position={origin}>
              <div className="h-6 w-6 rounded-full bg-primary border-2 border-white shadow flex items-center justify-center text-[9px] font-black text-white">
                A
              </div>
            </AdvancedMarker>

            <AdvancedMarker position={destination}>
              <div className="h-6 w-6 rounded-full bg-error border-2 border-white shadow flex items-center justify-center text-[9px] font-black text-white">
                B
              </div>
            </AdvancedMarker>
          </Map>
        </GoogleMapProvider>
      </div>

      <div className="flex items-center gap-3">
        <span className="px-3 py-1.5 bg-surface-container-low text-xs font-bold uppercase tracking-widest text-on-surface-variant">
          Distance: {directions.distanceText}
        </span>
        <span className="px-3 py-1.5 bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest">
          ETA: {directions.etaText}
        </span>
      </div>
    </div>
  )
}
