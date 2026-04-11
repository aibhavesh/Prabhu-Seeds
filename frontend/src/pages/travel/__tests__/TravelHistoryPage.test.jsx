import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import TravelHistoryPage from '../TravelHistoryPage'

vi.mock('../hooks/useTravel', () => ({
  useTravelHistory: vi.fn(),
}))

vi.mock('@/store/authStore', () => ({
  useAuthStore: (selector) => selector({ user: { id: 'field-1', role: 'field', name: 'Field User' } }),
}))

import { useTravelHistory } from '../hooks/useTravel'

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
        <TravelHistoryPage />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('TravelHistoryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useTravelHistory.mockReturnValue({
      data: {
        claims: [
          {
            id: 'h1',
            date: '2026-10-12',
            amount_inr: 650,
            distance_km: 42,
            status: 'approved',
            origin_city: 'Ujjain',
            destination_city: 'Dewas',
            timeline: [
              { label: 'Claim Submitted', at: '2026-10-12T10:00:00.000Z', state: 'done' },
              { label: 'Approved by Accounts', at: '2026-10-13T12:00:00.000Z', state: 'done' },
            ],
          },
        ],
      },
      isLoading: false,
      isError: false,
    })
  })

  it('renders travel history cards with timeline', () => {
    renderPage()

    expect(screen.getByText('My Travel History')).toBeInTheDocument()
    expect(screen.getByText(/Ujjain/)).toBeInTheDocument()
    expect(screen.getByText(/Approved by Accounts/)).toBeInTheDocument()
  })

  it('shows skeleton while loading', () => {
    useTravelHistory.mockReturnValue({ data: undefined, isLoading: true, isError: false })

    renderPage()
    expect(screen.getByTestId('travel-skeleton')).toBeInTheDocument()
  })

  it('shows empty state when no claims exist', () => {
    useTravelHistory.mockReturnValue({
      data: { claims: [] },
      isLoading: false,
      isError: false,
    })

    renderPage()
    expect(screen.getByText(/No travel claims found/i)).toBeInTheDocument()
  })
})
