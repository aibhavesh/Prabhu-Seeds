import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import LeaveManagementPage from '../LeaveManagementPage'

vi.mock('../hooks/useLeaves', () => ({
  useTeamLeaves: vi.fn(),
  usePendingLeaveRequests: vi.fn(),
  useTeamLeaveBalances: vi.fn(),
  useReviewLeaveRequest: vi.fn(),
}))

vi.mock('@/store/authStore', () => ({
  useAuthStore: (selector) => selector({ user: { id: 'mgr-1', role: 'manager', name: 'Maya Rao' } }),
}))

vi.mock('@/features/notifications/NotificationBell', () => ({
  default: () => <div data-testid="notification-bell" />,
}))

vi.mock('react-hot-toast', () => ({
  default: {
    promise: (value) => value,
  },
}))

import {
  usePendingLeaveRequests,
  useReviewLeaveRequest,
  useTeamLeaveBalances,
  useTeamLeaves,
} from '../hooks/useLeaves'

const mutateAsync = vi.fn().mockResolvedValue({ ok: true })

function renderPage() {
  return render(
    <MemoryRouter>
      <LeaveManagementPage />
    </MemoryRouter>
  )
}

describe('LeaveManagementPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    useTeamLeaves.mockReturnValue({
      data: {
        leaves: [
          {
            id: 'lv-1',
            staff_name: 'Anwar El Sadat',
            from_date: '2026-04-22',
            to_date: '2026-04-25',
            leave_type: 'earned',
            status: 'pending',
          },
        ],
      },
      isLoading: false,
    })

    usePendingLeaveRequests.mockReturnValue({
      data: {
        leaves: [
          {
            id: 'lv-1',
            staff_name: 'Anwar El Sadat',
            staff_role: 'Warehouse Lead',
            from_date: '2026-04-22',
            to_date: '2026-04-25',
            leave_type: 'earned',
            reason: 'Family visit',
            duration_days: 4,
            status: 'pending',
          },
        ],
      },
      isLoading: false,
    })

    useTeamLeaveBalances.mockReturnValue({
      data: {
        balances: [
          {
            id: 's-1',
            staff_name: 'Anwar El Sadat',
            earned: { used: 12, total: 20 },
            medical: { used: 5, total: 10 },
            casual: { used: 2, total: 5 },
          },
        ],
      },
      isLoading: false,
    })

    useReviewLeaveRequest.mockReturnValue({ mutateAsync, isPending: false })
  })

  it('renders calendar, pending requests, and staff balances', () => {
    renderPage()

    expect(screen.getByText('Leave Management')).toBeInTheDocument()
    expect(screen.getByText('Team Leave Calendar')).toBeInTheDocument()
    expect(screen.getByText('Pending Requests')).toBeInTheDocument()
    expect(screen.getByText('Staff Leave Balances')).toBeInTheDocument()
    expect(screen.getAllByText('Anwar El Sadat').length).toBeGreaterThan(0)
  })

  it('calls review mutation on approve action', async () => {
    renderPage()

    fireEvent.click(screen.getByRole('button', { name: /^Approve$/i }))

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({ leaveId: 'lv-1', decision: 'approved' })
    })
  })

  it('shows calendar skeleton while team leaves are loading', () => {
    useTeamLeaves.mockReturnValue({ data: undefined, isLoading: true })

    renderPage()

    expect(screen.getByTestId('leave-calendar-skeleton')).toBeInTheDocument()
  })
})
