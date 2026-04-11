import { useEffect, useRef } from 'react'
import { useMap, useMapsLibrary } from '@vis.gl/react-google-maps'

function toInitials(name) {
  const words = String(name ?? '')
    .split(' ')
    .map((word) => word.trim())
    .filter(Boolean)

  if (!words.length) return '??'
  return words.slice(0, 2).map((word) => word[0]?.toUpperCase() ?? '').join('')
}

function markerSvg({ initials, color, opacity, statusDotColor }) {
  return `
    <svg width="44" height="44" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="22" cy="22" r="18" fill="${color}" fill-opacity="${opacity}" stroke="white" stroke-width="3" />
      <text x="22" y="26" text-anchor="middle" font-size="11" font-weight="800" fill="white" font-family="Inter, sans-serif">${initials}</text>
      <circle cx="33.5" cy="10.5" r="5" fill="${statusDotColor}" stroke="white" stroke-width="1.5" />
    </svg>
  `
}

function animatePosition(marker, from, to, maps) {
  if (!from) {
    marker.setPosition(to)
    return
  }

  const start = performance.now()
  const duration = 450

  const frame = (time) => {
    const t = Math.min((time - start) / duration, 1)
    const eased = 1 - Math.pow(1 - t, 2)

    const lat = from.lat() + (to.lat() - from.lat()) * eased
    const lng = from.lng() + (to.lng() - from.lng()) * eased
    marker.setPosition(new maps.LatLng(lat, lng))

    if (t < 1) requestAnimationFrame(frame)
  }

  requestAnimationFrame(frame)
}

export default function EmployeeMarker({ employee, onClick }) {
  const map = useMap()
  const maps = useMapsLibrary('maps')

  const markerRef = useRef(null)
  const infoWindowRef = useRef(null)

  const lat = Number(employee?.lat)
  const lng = Number(employee?.lng)

  const markerTitle = employee?.name ?? 'Employee'
  const markerOpacity = employee?.statusMeta?.markerOpacity ?? 1
  const markerZIndex = employee?.status === 'online' ? 10 : employee?.status === 'stale' ? 8 : 6
  const statusDotColor = employee?.status === 'online' ? '#22c55e' : employee?.status === 'stale' ? '#f59e0b' : '#9ca3af'
  const markerColor = employee?.departmentColor ?? '#0d631b'
  const lastSeenLabel = employee?.lastSeenLabel ?? 'No recent update'
  const initials = toInitials(employee?.name)

  useEffect(() => {
    const markerLatLng = Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null
    if (!map || !maps || !markerLatLng) return

    const icon = {
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
        markerSvg({
          initials,
          color: markerColor,
          opacity: markerOpacity,
          statusDotColor,
        })
      )}`,
      scaledSize: new maps.Size(44, 44),
      anchor: new maps.Point(22, 22),
    }

    if (!markerRef.current) {
      markerRef.current = new maps.Marker({
        map,
        position: markerLatLng,
        icon,
        title: markerTitle,
        optimized: true,
        zIndex: markerZIndex,
      })

      infoWindowRef.current = new maps.InfoWindow()
    }

    markerRef.current.setIcon(icon)
    markerRef.current.setZIndex(markerZIndex)
    markerRef.current.setTitle(markerTitle)

    maps.event.clearListeners(markerRef.current, 'click')
    markerRef.current.addListener('click', () => {
      const content = `
        <div style="min-width:170px;padding:4px 2px;font-family:Inter,sans-serif;">
          <p style="margin:0 0 4px 0;font-size:14px;font-weight:700;color:#181d1b;">${markerTitle}</p>
          <p style="margin:0;font-size:12px;color:#40493d;">Last updated ${lastSeenLabel}</p>
        </div>
      `
      infoWindowRef.current.setContent(content)
      infoWindowRef.current.open({ map, anchor: markerRef.current })
      onClick?.(employee)
    })

    const previous = markerRef.current.getPosition()
    const next = new maps.LatLng(markerLatLng.lat, markerLatLng.lng)
    animatePosition(markerRef.current, previous, next, maps)
  }, [map, maps, lat, lng, initials, markerColor, markerOpacity, statusDotColor, markerTitle, markerZIndex, lastSeenLabel, employee, onClick])

  useEffect(() => {
    return () => {
      markerRef.current?.setMap(null)
      markerRef.current = null
      infoWindowRef.current?.close?.()
      infoWindowRef.current = null
    }
  }, [])

  return null
}
