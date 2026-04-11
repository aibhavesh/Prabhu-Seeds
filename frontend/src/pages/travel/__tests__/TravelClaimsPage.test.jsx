import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import TravelClaimsPage from '../TravelClaimsPage'

vi.mock('../hooks/useTravel', () => ({
  useTravelClaims: vi.fn(),
}))

vi.mock('@/store/authStore', () => ({
  useAuthStore: (selector) => selector({ user: { id: 'acc-1', role: 'accounts', name: 'Accounts User' } }),
}))

vi.mock('@/components/maps/TaskRouteMap', () => ({
  default: ({ origin, destination }) => (
    <div data-testid="task-route-map">Route {origin?.lat},{origin?.lng} to {destination?.lat},{destination?.lng}</div>
  ),
}))

vi.mock('react-to-pdf', () => ({
  default: vi.fn(),
}))

import { useTravelClaims } from '../hooks/useTravel'

const travelResponse = {
  claims: [
    {
      id: 'c1',
      staff_name: 'Arjun Reddy',
      date: '2026-10-14',
      distance_km: 142.5,
      ppk_rate: 8.5,
      amount_inr: 1211.25,
      status: 'pending',
      department: 'Agronomy',
      origin: { lat: 23.2, lng: 77.3 },
      destination: { lat: 23.3, lng: 77.4 },
    },
    {
      id: 'c2',
      staff_name: 'Priya Patil',
      date: '2026-10-13',
      distance_km: 88,
      ppk_rate: 12,
      amount_inr: 1056,
      status: 'approved',
      department: 'Quality',
      origin: { lat: 23.22, lng: 77.31 },
      destination: { lat: 23.35, lng: 77.45 },
    },
  ],
  pagination: {
    page: 1,
    totalPages: 3,
    total: 24,
    pageSize: 8,
  },
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <TravelClaimsPage />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('TravelClaimsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useTravelClaims.mockReturnValue({
      data: travelResponse,
      isLoading: false,
      isError: false,
    })
  })

  it('renders summary cards and table rows', () => {
    renderPage()

    expect(screen.getByText('Travel Claims')).toBeInTheDocument()
    expect(screen.getByText(/Total Pending INR/i)).toBeInTheDocument()
    expect(screen.getByText('Arjun Reddy')).toBeInTheDocument()
    expect(screen.getByText('Priya Patil')).toBeInTheDocument()
  })

  it('opens GPS route modal from table action', async () => {
    renderPage()

    fireEvent.click(screen.getAllByRole('button', { name: /view route/i })[0])

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'GPS Route' })).toBeInTheDocument()
      expect(screen.getByTestId('task-route-map')).toBeInTheDocument()
    })
  })

  it('confirms approve action through AlertDialog and updates row status', async () => {
    renderPage()

    const arjunCell = screen.getByText('Arjun Reddy')
    const arjunRow = arjunCell.closest('tr')
    expect(arjunRow).not.toBeNull()
    fireEvent.click(within(arjunRow).getByRole('button', { name: /^Approve$/i }))

    await waitFor(() => {
      expect(screen.getByText('Confirm Action')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /confirm/i }))

    await waitFor(() => {
      expect(screen.getAllByText('Approved').length).toBeGreaterThan(0)
    })
  })

  it('updates hook params when changing date range filter', async () => {
    renderPage()

    const fromDate = screen.getByLabelText('From date')
    fireEvent.change(fromDate, { target: { value: '2026-10-01' } })

    await waitFor(() => {
      const lastCall = useTravelClaims.mock.calls.at(-1)[0]
      expect(lastCall.fromDate).toBe('2026-10-01')
    })
  })

  it('shows skeleton while loading', () => {
    useTravelClaims.mockReturnValue({ data: undefined, isLoading: true, isError: false })

    renderPage()
    expect(screen.getByTestId('travel-skeleton')).toBeInTheDocument()
  })
})
