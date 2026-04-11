import { useEffect, useRef } from 'react'
import { useMap, useMapsLibrary } from '@vis.gl/react-google-maps'

export default function GooglePolyline({ path, strokeColor = '#0d631b', strokeWeight = 4, strokeOpacity = 1 }) {
  const map = useMap()
  const maps = useMapsLibrary('maps')
  const polylineRef = useRef(null)

  useEffect(() => {
    if (!map || !maps || !Array.isArray(path) || path.length < 2) return

    if (!polylineRef.current) {
      polylineRef.current = new maps.Polyline({
        map,
        path,
        geodesic: true,
        strokeColor,
        strokeOpacity,
        strokeWeight,
      })
      return
    }

    polylineRef.current.setOptions({
      map,
      path,
      geodesic: true,
      strokeColor,
      strokeOpacity,
      strokeWeight,
    })
  }, [map, maps, path, strokeColor, strokeOpacity, strokeWeight])

  useEffect(() => {
    return () => {
      polylineRef.current?.setMap(null)
      polylineRef.current = null
    }
  }, [])

  return null
}
