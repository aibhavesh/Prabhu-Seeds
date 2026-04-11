import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import AttendanceDetailPage from '../AttendanceDetailPage'

vi.mock('../hooks/useAttendance', () => ({
  useAttendanceReport: vi.fn(),
}))

vi.mock('../components/GPSTrackMap', () => ({
  default: ({ points }) => <div data-testid="gps-track-map-mock">Map points: {points.length}</div>,
}))

import { useAttendanceReport } from '../hooks/useAttendance'

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

function renderPage() {
  const queryClient = makeQueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/attendance/u1/track?date=2026-10-24']}>
        <Routes>
          <Route path="/attendance/:staffId/track" element={<AttendanceDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('AttendanceDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows skeleton while attendance report is loading', () => {
    useAttendanceReport.mockReturnValue({ data: undefined, isLoading: true, isError: false })

    renderPage()
    expect(screen.getByTestId('attendance-detail-skeleton')).toBeInTheDocument()
  })

  it('renders route summary and waypoint log when data is available', () => {
    useAttendanceReport.mockReturnValue({
      data: {
        staff: { name: 'Amit Sharma', department: 'Marketing' },
        summary: {
          distanceKm: 42.3,
          durationHours: 8.25,
          waypoints: 4,
          estimatedPay: 338.4,
        },
        track_points: [
          { lat: 23.2, lng: 77.3, timestamp: '2026-10-24T09:15:00.000Z' },
          { lat: 23.3, lng: 77.4, timestamp: '2026-10-24T17:30:00.000Z' },
        ],
        waypoints: [
          {
            timestamp: '2026-10-24T10:42:00.000Z',
            location_name: 'Near Mahakal Temple',
            speed_kmh: 14,
            movement: 'Moving',
          },
        ],
      },
      isLoading: false,
      isError: false,
    })

    renderPage()

    expect(screen.getByText(/route summary/i)).toBeInTheDocument()
    expect(screen.getByText('42.3 km')).toBeInTheDocument()
    expect(screen.getByText('8.3h')).toBeInTheDocument()
    expect(screen.getByText('Near Mahakal Temple')).toBeInTheDocument()
    expect(screen.getByTestId('gps-track-map-mock')).toBeInTheDocument()
  })
})
