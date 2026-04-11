import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import AttendanceOverviewPage from '../AttendanceOverviewPage'

vi.mock('../hooks/useAttendance', () => ({
  useAttendance: vi.fn(),
  useAttendanceReport: vi.fn(),
}))

import { useAttendance, useAttendanceReport } from '../hooks/useAttendance'

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

function renderPage() {
  const queryClient = makeQueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/attendance']}>
        <Routes>
          <Route path="/attendance" element={<AttendanceOverviewPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

const attendanceResponse = {
  summary: {
    present_today: 12,
    absent_today: 3,
    avg_hours: 7.2,
    total_travel_km: 342.5,
  },
  today_check_ins: [
    {
      id: 'a1',
      staff_id: 'u1',
      staff_name: 'Amit Sharma',
      department: 'Marketing',
      check_in: '2026-10-24T09:15:00.000Z',
      check_out: '2026-10-24T17:45:00.000Z',
      hours_worked: 8.5,
      gps_accuracy_m: 8,
      travel_pay: 537,
      travel_claim_status: 'pending',
    },
  ],
  pagination: {
    page: 1,
    totalPages: 3,
    total: 18,
    pageSize: 6,
  },
}

const reportResponse = {
  calendar_days: [
    { date: '2026-10-01', attendance_pct: 90 },
    { date: '2026-10-02', attendance_pct: 74 },
    { date: '2026-10-03', attendance_pct: 48 },
  ],
}

describe('AttendanceOverviewPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAttendance.mockReturnValue({
      data: attendanceResponse,
      isLoading: false,
      isError: false,
    })
    useAttendanceReport.mockReturnValue({
      data: reportResponse,
      isLoading: false,
      isError: false,
    })
  })

  it('renders overview cards and check-in table', () => {
    renderPage()

    expect(screen.getByText('Attendance Overview')).toBeInTheDocument()
    expect(screen.getByText('12')).toBeInTheDocument()
    expect(screen.getByText('Today\'s Check-ins')).toBeInTheDocument()
    expect(screen.getByText('Amit Sharma')).toBeInTheDocument()
    expect(screen.getByTestId('attendance-heatmap')).toBeInTheDocument()
  })

  it('renders skeleton loader while fetching', () => {
    useAttendance.mockReturnValue({ data: undefined, isLoading: true, isError: false })
    useAttendanceReport.mockReturnValue({ data: undefined, isLoading: true, isError: false })

    renderPage()
    expect(screen.getByTestId('attendance-overview-skeleton')).toBeInTheDocument()
  })

  it('approves a travel claim row from action button', async () => {
    renderPage()

    const approveButton = screen.getByRole('button', { name: /approve travel claim/i })
    fireEvent.click(approveButton)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /approved/i })).toBeDisabled()
    })
  })

  it('changes page when clicking next pagination button', async () => {
    renderPage()

    fireEvent.click(screen.getByRole('button', { name: /next/i }))

    await waitFor(() => {
      const lastCall = useAttendance.mock.calls.at(-1)[0]
      expect(lastCall.page).toBe(2)
    })
  })
})
