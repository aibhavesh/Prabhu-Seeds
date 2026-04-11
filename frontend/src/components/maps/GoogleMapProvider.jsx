import { APIProvider } from '@vis.gl/react-google-maps'

export default function GoogleMapProvider({ children, fallbackClassName = 'h-72' }) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

  if (!apiKey) {
    return (
      <div className={`w-full ${fallbackClassName} bg-surface-container-low text-on-surface-variant text-sm flex items-center justify-center`}>
        Google Maps API key missing. Set VITE_GOOGLE_MAPS_API_KEY.
      </div>
    )
  }

  return <APIProvider apiKey={apiKey}>{children}</APIProvider>
}
