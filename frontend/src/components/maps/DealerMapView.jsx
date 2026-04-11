import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Map, InfoWindow, useMap, useMapsLibrary } from '@vis.gl/react-google-maps'
import { MarkerClusterer } from '@googlemaps/markerclusterer'
import apiClient from '@/lib/axios'
import GoogleMapProvider from './GoogleMapProvider'
import MapLoadingSkeleton from './MapLoadingSkeleton'

function createDealerIcon(maps) {
  const svg = `
    <svg width="34" height="34" viewBox="0 0 34 34" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="17" cy="17" r="16" fill="#0d631b" stroke="white" stroke-width="2"/>
      <path d="M10 12h14v2H10v-2zm1 3h12v8h-2v-2H13v2h-2v-8zm3 2v2h6v-2h-6z" fill="white"/>
    </svg>`

  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new maps.Size(34, 34),
    anchor: new maps.Point(17, 17),
  }
}

function normalizeDealers(payload) {
  const rows = payload?.dealers ?? payload?.items ?? payload?.data ?? payload ?? []
  if (!Array.isArray(rows)) return []

  return rows
    .map((row, idx) => ({
      id: row.id ?? row.dealer_id ?? `dealer-${idx}`,
      name: row.name ?? row.dealer_name ?? 'Dealer',
      region: row.region ?? row.state ?? row.city ?? '--',
      lastOrderDate: row.last_order_date ?? row.lastOrderDate ?? '--',
      lat: Number(row.lat ?? row.latitude ?? row.location?.lat),
      lng: Number(row.lng ?? row.longitude ?? row.location?.lng),
    }))
    .filter((row) => Number.isFinite(row.lat) && Number.isFinite(row.lng))
}

function DealerMarkerCluster({ dealers, onSelect }) {
  const map = useMap()
  const maps = useMapsLibrary('maps')
  const markersRef = useRef([])
  const clusterRef = useRef(null)

  useEffect(() => {
    if (!map || !maps) return

    markersRef.current.forEach((marker) => marker.setMap(null))
    markersRef.current = []
    clusterRef.current?.clearMarkers()

    if (!dealers.length) return

    const icon = createDealerIcon(maps)

    const markers = dealers.map((dealer) => {
      const marker = new maps.Marker({
        position: { lat: dealer.lat, lng: dealer.lng },
        icon,
        title: dealer.name,
      })

      marker.addListener('click', () => onSelect(dealer))
      return marker
    })

    clusterRef.current = new MarkerClusterer({ map, markers })
    markersRef.current = markers

    return () => {
      clusterRef.current?.clearMarkers()
      markers.forEach((marker) => marker.setMap(null))
    }
  }, [map, maps, dealers, onSelect])

  return null
}

export default function DealerMapView({ endpoint = '/api/v1/dealers', queryParams = {}, heightClass = 'h-[520px]' }) {
  const [selectedDealer, setSelectedDealer] = useState(null)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['dealers-map', endpoint, queryParams],
    queryFn: () => apiClient.get(endpoint, { params: queryParams }).then((res) => res.data),
  })

  const dealers = useMemo(() => normalizeDealers(data), [data])

  const center = useMemo(() => {
    if (!dealers.length) return { lat: 23.2599, lng: 77.4126 }
    return { lat: dealers[0].lat, lng: dealers[0].lng }
  }, [dealers])

  const handleSelectDealer = useCallback((dealer) => {
    setSelectedDealer(dealer)
  }, [])

  if (isLoading) {
    return <MapLoadingSkeleton heightClass={heightClass} label="Loading dealer locations..." />
  }

  if (isError) {
    return (
      <div className={`w-full ${heightClass} bg-surface-container-low text-error flex items-center justify-center text-sm`}>
        Failed to load dealer locations.
      </div>
    )
  }

  if (!dealers.length) {
    return (
      <div className={`w-full ${heightClass} bg-surface-container-low text-on-surface-variant flex items-center justify-center text-sm`}>
        No dealer coordinates available.
      </div>
    )
  }

  return (
    <div className={`${heightClass} bg-surface-container-lowest shadow-ghost overflow-hidden`}>
      <GoogleMapProvider fallbackClassName={heightClass}>
        <Map
          defaultCenter={center}
          defaultZoom={10}
          gestureHandling="greedy"
          mapId={import.meta.env.VITE_GOOGLE_MAP_ID}
        >
          <DealerMarkerCluster dealers={dealers} onSelect={handleSelectDealer} />

          {selectedDealer && (
            <InfoWindow
              position={{ lat: selectedDealer.lat, lng: selectedDealer.lng }}
              onCloseClick={() => setSelectedDealer(null)}
            >
              <div className="min-w-[180px] py-1">
                <p className="text-sm font-bold text-on-surface">{selectedDealer.name}</p>
                <p className="text-xs text-on-surface-variant mt-1">Region: {selectedDealer.region}</p>
                <p className="text-xs text-on-surface-variant">Last order: {selectedDealer.lastOrderDate}</p>
              </div>
            </InfoWindow>
          )}
        </Map>
      </GoogleMapProvider>
    </div>
  )
}
