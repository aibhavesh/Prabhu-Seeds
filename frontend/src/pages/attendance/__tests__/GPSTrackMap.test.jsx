import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import GPSTrackMap from '../components/GPSTrackMap'

vi.mock('@vis.gl/react-google-maps', () => ({
  APIProvider: ({ children }) => <div data-testid="api-provider">{children}</div>,
  Map: ({ children }) => <div data-testid="map">{children}</div>,
  AdvancedMarker: ({ children }) => <div data-testid="marker">{children}</div>,
  useMap: () => null,
  useMapsLibrary: () => null,
}))

const points = [
  { lat: 23.2, lng: 77.3, timestamp: '2026-10-24T09:15:00.000Z' },
  { lat: 23.25, lng: 77.35, timestamp: '2026-10-24T10:15:00.000Z' },
  { lat: 23.3, lng: 77.4, timestamp: '2026-10-24T11:15:00.000Z' },
]

describe('GPSTrackMap', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('VITE_GOOGLE_MAPS_API_KEY', 'demo-key')
  })

  it('renders map shell and playback controls', () => {
    render(<GPSTrackMap points={points} />)

    expect(screen.getByTestId('gps-track-map')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /play replay/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /step forward/i })).toBeInTheDocument()
  })

  it('toggles play button state between play and pause', () => {
    render(<GPSTrackMap points={points} />)

    const playButton = screen.getByRole('button', { name: /play replay/i })
    fireEvent.click(playButton)

    expect(screen.getByRole('button', { name: /pause replay/i })).toBeInTheDocument()
  })

  it('renders fallback message when map api key is missing', () => {
    vi.stubEnv('VITE_GOOGLE_MAPS_API_KEY', '')

    render(<GPSTrackMap points={points} />)

    expect(screen.getByText(/google maps api key is missing/i)).toBeInTheDocument()
  })
})
