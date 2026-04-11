import { Map, AdvancedMarker } from '@vis.gl/react-google-maps'
import GoogleMapProvider from './GoogleMapProvider'
import MapLoadingSkeleton from './MapLoadingSkeleton'

export default function MiniMap({ location, isLoading = false, className = 'w-[200px] h-[150px]', zoom = 14 }) {
  const hasLocation = Number.isFinite(location?.lat) && Number.isFinite(location?.lng)

  if (isLoading) {
    return <MapLoadingSkeleton heightClass="h-[150px]" label="Loading map..." />
  }

  if (!hasLocation) {
    return (
      <div className="w-full h-[150px] bg-surface-container-low text-on-surface-variant flex items-center justify-center text-xs">
        Location unavailable
      </div>
    )
  }

  return (
    <div className={`${className} min-w-[200px] max-w-full bg-surface-container-lowest shadow-ghost overflow-hidden`}>
      <GoogleMapProvider fallbackClassName="h-[150px]">
        <Map
          defaultCenter={location}
          defaultZoom={zoom}
          disableDefaultUI
          gestureHandling="none"
          mapId={import.meta.env.VITE_GOOGLE_MAP_ID}
        >
          <AdvancedMarker position={location}>
            <div className="h-4 w-4 rounded-full border-2 border-white bg-primary" />
          </AdvancedMarker>
        </Map>
      </GoogleMapProvider>
    </div>
  )
}
