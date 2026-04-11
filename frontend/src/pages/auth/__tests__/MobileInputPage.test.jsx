import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import MobileInputPage from '../MobileInputPage'

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock('@/lib/axios', () => ({
  default: { post: vi.fn() },
}))

vi.mock('react-hot-toast', () => ({
  default: {
    promise: vi.fn(),
    error: vi.fn(),
  },
}))

import apiClient from '@/lib/axios'
import toast from 'react-hot-toast'

// ── Helpers ────────────────────────────────────────────────────────────────

function renderPage() {
  return render(
    <MemoryRouter>
      <MobileInputPage />
    </MemoryRouter>
  )
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('MobileInputPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders branding, input, and button', () => {
    renderPage()
    expect(screen.getByText('Prabhu Seeds')).toBeInTheDocument()
    expect(screen.getByText('PGA AgriTask')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Enter 10 digit number')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /send otp/i })).toBeInTheDocument()
  })

  it('Send OTP button is disabled when input is empty', () => {
    renderPage()
    expect(screen.getByRole('button', { name: /send otp/i })).toBeDisabled()
  })

  it('Send OTP button remains disabled for fewer than 10 digits', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.type(screen.getByPlaceholderText('Enter 10 digit number'), '98765')
    expect(screen.getByRole('button', { name: /send otp/i })).toBeDisabled()
  })

  it('Send OTP button is enabled when exactly 10 digits are entered', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.type(screen.getByPlaceholderText('Enter 10 digit number'), '9876543210')
    expect(screen.getByRole('button', { name: /send otp/i })).toBeEnabled()
  })

  it('strips non-numeric characters from input', async () => {
    const user = userEvent.setup()
    renderPage()
    const input = screen.getByPlaceholderText('Enter 10 digit number')
    await user.type(input, 'abc123xyz')
    expect(input.value).toBe('123')
  })

  it('calls POST /api/v1/auth/send-otp with +91 prefix on submit', async () => {
    const user = userEvent.setup()
    toast.promise.mockResolvedValue({})
    renderPage()
    await user.type(screen.getByPlaceholderText('Enter 10 digit number'), '9876543210')
    await user.click(screen.getByRole('button', { name: /send otp/i }))

    await waitFor(() => {
      expect(toast.promise).toHaveBeenCalledOnce()
      // First arg to toast.promise is the axios call
      const [axiosCall] = toast.promise.mock.calls[0]
      expect(apiClient.post).toHaveBeenCalledWith('/api/v1/auth/send-otp', {
        mobile: '+919876543210',
      })
    })
  })

  it('navigates to /auth/verify with mobile in state on success', async () => {
    const user = userEvent.setup()
    toast.promise.mockResolvedValue({ data: {} })
    renderPage()
    await user.type(screen.getByPlaceholderText('Enter 10 digit number'), '9876543210')
    await user.click(screen.getByRole('button', { name: /send otp/i }))

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/auth/verify', {
        state: { mobile: '9876543210' },
      })
    })
  })

  it('does not navigate when the API call fails', async () => {
    const user = userEvent.setup()
    toast.promise.mockRejectedValue(new Error('Network error'))
    renderPage()
    await user.type(screen.getByPlaceholderText('Enter 10 digit number'), '9876543210')
    await user.click(screen.getByRole('button', { name: /send otp/i }))

    await waitFor(() => {
      expect(mockNavigate).not.toHaveBeenCalled()
    })
  })

  it('renders footer links', () => {
    renderPage()
    expect(screen.getByRole('link', { name: /privacy policy/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /terms of service/i })).toBeInTheDocument()
  })
})
