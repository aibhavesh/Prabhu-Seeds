import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import MyLeavesPage from '../MyLeavesPage'

vi.mock('../hooks/useLeaves', () => ({
  useMyLeaveBalances: vi.fn(),
  useMyLeaveHistory: vi.fn(),
  useApplyLeave: vi.fn(),
}))

vi.mock('@/store/authStore', () => ({
  useAuthStore: (selector) => selector({ user: { id: 'fld-1', role: 'field', name: 'Rajesh Kumar' } }),
}))

vi.mock('@/features/notifications/NotificationBell', () => ({
  default: () => <div data-testid="notification-bell" />,
}))

vi.mock('react-hot-toast', () => ({
  default: {
    promise: (value) => value,
  },
}))

import { useApplyLeave, useMyLeaveBalances, useMyLeaveHistory } from '../hooks/useLeaves'

const mutateAsync = vi.fn().mockResolvedValue({ ok: true })

function renderPage() {
  return render(
    <MemoryRouter>
      <MyLeavesPage />
    </MemoryRouter>
  )
}

describe('MyLeavesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    useMyLeaveBalances.mockReturnValue({
      data: {
        balances: {
          casual: { used: 3, total: 15 },
          medical: { used: 2, total: 10 },
          earned: { used: 8, total: 30 },
        },
      },
      isLoading: false,
    })

    useMyLeaveHistory.mockReturnValue({
      data: {
        history: [
          {
            id: 'h-1',
            from_date: '2026-04-12',
            to_date: '2026-04-14',
            duration_days: 3,
            leave_type: 'casual',
            reason: 'Family function',
            status: 'approved',
            approved_by: 'Rajesh Kumar',
          },
        ],
      },
      isLoading: false,
    })

    useApplyLeave.mockReturnValue({
      mutateAsync,
      isPending: false,
    })
  })

  it('renders leave balances and history rows', () => {
    renderPage()

    expect(screen.getByRole('heading', { name: 'My Leaves' })).toBeInTheDocument()
    expect(screen.getByText('Leave History')).toBeInTheDocument()
    expect(screen.getByText('Family function')).toBeInTheDocument()
  })

  it('validates apply leave form fields', async () => {
    renderPage()

    fireEvent.click(screen.getByRole('button', { name: /apply leave/i }))

    fireEvent.change(screen.getByLabelText('From Date'), { target: { value: '2026-04-20' } })
    fireEvent.change(screen.getByLabelText('To Date'), { target: { value: '2026-04-21' } })
    fireEvent.change(screen.getByLabelText('Leave Type'), { target: { value: 'casual' } })
    fireEvent.change(screen.getByLabelText('Reason'), { target: { value: 'Too short' } })

    fireEvent.click(screen.getByRole('button', { name: /submit request/i }))

    await waitFor(() => {
      expect(screen.getByText('Reason must be at least 10 characters')).toBeInTheDocument()
    })
  })

  it('submits a valid leave request', async () => {
    renderPage()

    fireEvent.click(screen.getByRole('button', { name: /apply leave/i }))

    fireEvent.change(screen.getByLabelText('From Date'), { target: { value: '2026-04-20' } })
    fireEvent.change(screen.getByLabelText('To Date'), { target: { value: '2026-04-21' } })
    fireEvent.change(screen.getByLabelText('Leave Type'), { target: { value: 'medical' } })
    fireEvent.change(screen.getByLabelText('Reason'), { target: { value: 'Scheduled dental appointment and recovery day' } })

    fireEvent.click(screen.getByRole('button', { name: /submit request/i }))

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({
        from_date: '2026-04-20',
        to_date: '2026-04-21',
        leave_type: 'medical',
        reason: 'Scheduled dental appointment and recovery day',
      })
    })
  })
})
