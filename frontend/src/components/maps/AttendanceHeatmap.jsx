import { useEffect, useMemo, useRef } from 'react'
import { Map, useMap, useMapsLibrary } from '@vis.gl/react-google-maps'
import GoogleMapProvider from './GoogleMapProvider'
import MapLoadingSkeleton from './MapLoadingSkeleton'

function toWeightedWaypoints(gpsWaypoints = []) {
  const buckets = new Map()

  for (const point of gpsWaypoints) {
    const lat = Number(point.lat ?? point.latitude)
    const lng = Number(point.lng ?? point.longitude)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue

    const key = `${lat.toFixed(4)},${lng.toFixed(4)}`
    const current = buckets.get(key)

    if (current) {
      current.weight += 1
    } else {
      buckets.set(key, { lat, lng, weight: 1 })
    }
  }

  return Array.from(buckets.values())
}

function HeatmapOverlay({ points }) {
  const map = useMap()
  const maps = useMapsLibrary('maps')
  const visualization = useMapsLibrary('visualization')
  const layerRef = useRef(null)

  useEffect(() => {
    if (!map || !maps || !visualization || !points.length) return

    const data = points.map((point) => ({
      location: new maps.LatLng(point.lat, point.lng),
      weight: point.weight,
    }))

    if (!layerRef.current) {
      layerRef.current = new visualization.HeatmapLayer({
        map,
        data,
        radius: 26,
        opacity: 0.85,
        gradient: [
          'rgba(13, 99, 27, 0)',
          'rgba(13, 99, 27, 0.4)',
          'rgba(46, 125, 50, 0.75)',
          'rgba(0, 106, 99, 0.85)',
          'rgba(186, 26, 26, 0.95)',
        ],
      })
      return
    }

    layerRef.current.setData(data)
  }, [map, maps, visualization, points])

  useEffect(() => {
    return () => {
      layerRef.current?.setMap(null)
      layerRef.current = null
    }
  }, [])

  return null
}

function centerOf(points) {
  if (!points.length) return { lat: 23.2599, lng: 77.4126 }
  const total = points.reduce((acc, point) => ({ lat: acc.lat + point.lat, lng: acc.lng + point.lng }), {
    lat: 0,
    lng: 0,
  })

  return {
    lat: total.lat / points.length,
    lng: total.lng / points.length,
  }
}

export default function AttendanceHeatmap({ gps_waypoints = [], isLoading = false, heightClass = 'h-[420px]' }) {
  const points = useMemo(() => toWeightedWaypoints(gps_waypoints), [gps_waypoints])

  if (isLoading) {
    return <MapLoadingSkeleton heightClass={heightClass} label="Loading attendance heatmap..." />
  }

  if (!points.length) {
    return (
      <div className={`w-full ${heightClass} bg-surface-container-low text-on-surface-variant flex items-center justify-center text-sm`}>
        No GPS attendance waypoints found.
      </div>
    )
  }

  return (
    <div className={`${heightClass} bg-surface-container-lowest shadow-ghost overflow-hidden`}>
      <GoogleMapProvider fallbackClassName={heightClass}>
        <Map
          defaultCenter={centerOf(points)}
          defaultZoom={11}
          disableDefaultUI
          gestureHandling="greedy"
          mapId={import.meta.env.VITE_GOOGLE_MAP_ID}
        >
          <HeatmapOverlay points={points} />
        </Map>
      </GoogleMapProvider>
    </div>
  )
}
