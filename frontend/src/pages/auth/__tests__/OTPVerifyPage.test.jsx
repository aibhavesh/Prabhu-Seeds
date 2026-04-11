import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act, fireEvent } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import OTPVerifyPage from '../OTPVerifyPage'

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

const mockSetAuth = vi.fn()
vi.mock('@/store/authStore', () => ({
  useAuthStore: (selector) =>
    selector({
      setAuth: mockSetAuth,
      clearAuth: vi.fn(),
      user: null,
      token: null,
    }),
}))

import apiClient from '@/lib/axios'
import toast from 'react-hot-toast'

// ── Helpers ────────────────────────────────────────────────────────────────

function renderPage(mobile = '9876543210') {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/auth/verify', state: { mobile } }]}>
      <Routes>
        <Route path="/auth/verify" element={<OTPVerifyPage />} />
      </Routes>
    </MemoryRouter>
  )
}

/** Fill OTP boxes with fireEvent (synchronous, no timer dependency). */
function fillOTP(code = '123456') {
  for (let i = 0; i < code.length; i++) {
    fireEvent.change(screen.getByLabelText(`OTP digit ${i + 1}`), {
      target: { value: code[i] },
    })
  }
}

/**
 * Flush pending microtasks and React state updates.
 * Works even when fake timers are active because microtasks are not faked.
 */
const flushAsync = () => act(async () => {})

// ── Tests ──────────────────────────────────────────────────────────────────

describe('OTPVerifyPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()   // All tests run with fake timers
  })

  afterEach(() => {
    vi.useRealTimers()   // Always restore — runs even after a failing test
  })

  // ── Rendering ────────────────────────────────────────────────────────────

  it('renders title and masked mobile number', () => {
    renderPage()
    expect(screen.getByText('Verify OTP')).toBeInTheDocument()
    // maskMobile('9876543210') → '98XXXXX210'
    expect(screen.getByText('98XXXXX210')).toBeInTheDocument()
  })

  it('renders 6 OTP input boxes', () => {
    renderPage()
    expect(screen.getAllByRole('textbox')).toHaveLength(6)
  })

  it('Verify button is disabled when OTP is incomplete', () => {
    renderPage()
    expect(screen.getByRole('button', { name: /verify/i })).toBeDisabled()
  })

  it('Verify button is enabled when all 6 digits are filled', () => {
    renderPage()
    fillOTP()
    expect(screen.getByRole('button', { name: /verify/i })).toBeEnabled()
  })

  // ── Countdown timer ──────────────────────────────────────────────────────

  it('shows countdown timer initially', () => {
    renderPage()
    expect(screen.getByText(/resend otp in/i)).toBeInTheDocument()
  })

  it('shows Resend OTP button after countdown reaches zero', async () => {
    renderPage()
    // Each tick: fire timer → setState → re-render → new timer.
    // Each act() fully flushes React (incl. passive effects) before the next tick.
    for (let i = 0; i < 60; i++) {
      await act(async () => { vi.advanceTimersByTime(1000) })
    }
    expect(screen.getByRole('button', { name: /resend otp/i })).toBeInTheDocument()
  })

  // ── API calls ────────────────────────────────────────────────────────────

  it('calls verify-otp API with correct payload', async () => {
    toast.promise.mockResolvedValue({
      data: { user: { id: '1', role: 'field', name: 'Test', mobile: '9876543210' }, token: 'tok' },
    })
    renderPage()
    fillOTP('654321')
    fireEvent.click(screen.getByRole('button', { name: /verify/i }))
    await flushAsync()

    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/auth/verify-otp', {
      mobile: '+919876543210',
      otp: '654321',
    })
  })

  it('calls setAuth and navigates to /dashboard/field for role "field"', async () => {
    const responseData = {
      data: { user: { id: '1', role: 'field', name: 'Test', mobile: '9876543210' }, token: 'tok' },
    }
    toast.promise.mockResolvedValue(responseData)
    renderPage()
    fillOTP()
    fireEvent.click(screen.getByRole('button', { name: /verify/i }))
    await flushAsync()

    expect(mockSetAuth).toHaveBeenCalledWith(responseData.data.user, responseData.data.token)
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard/field', { replace: true })
  })

  it('navigates to /dashboard/owner for role "owner"', async () => {
    toast.promise.mockResolvedValue({
      data: { user: { id: '2', role: 'owner', name: 'Owner', mobile: '9876543210' }, token: 't2' },
    })
    renderPage()
    fillOTP()
    fireEvent.click(screen.getByRole('button', { name: /verify/i }))
    await flushAsync()

    expect(mockNavigate).toHaveBeenCalledWith('/dashboard/owner', { replace: true })
  })

  it('navigates to /dashboard/manager for role "manager"', async () => {
    toast.promise.mockResolvedValue({
      data: { user: { id: '3', role: 'manager', name: 'Mgr', mobile: '9876543210' }, token: 't3' },
    })
    renderPage()
    fillOTP()
    fireEvent.click(screen.getByRole('button', { name: /verify/i }))
    await flushAsync()

    expect(mockNavigate).toHaveBeenCalledWith('/dashboard/manager', { replace: true })
  })

  it('navigates to /dashboard/accounts for role "accounts"', async () => {
    toast.promise.mockResolvedValue({
      data: { user: { id: '4', role: 'accounts', name: 'Acc', mobile: '9876543210' }, token: 't4' },
    })
    renderPage()
    fillOTP()
    fireEvent.click(screen.getByRole('button', { name: /verify/i }))
    await flushAsync()

    expect(mockNavigate).toHaveBeenCalledWith('/dashboard/accounts', { replace: true })
  })

  it('clears OTP boxes and does not navigate on API error', async () => {
    toast.promise.mockRejectedValue(new Error('Invalid OTP'))
    renderPage()
    fillOTP()
    fireEvent.click(screen.getByRole('button', { name: /verify/i }))
    await flushAsync()

    expect(mockNavigate).not.toHaveBeenCalled()
    screen.getAllByRole('textbox').forEach((box) => expect(box.value).toBe(''))
  })

  // ── Resend ───────────────────────────────────────────────────────────────

  it('resend button calls send-otp and resets countdown', async () => {
    toast.promise.mockResolvedValue({})
    renderPage()

    for (let i = 0; i < 60; i++) {
      await act(async () => { vi.advanceTimersByTime(1000) })
    }
    expect(screen.getByRole('button', { name: /resend otp/i })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /resend otp/i }))
    await flushAsync()

    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/auth/send-otp', {
      mobile: '+919876543210',
    })
    // Countdown should have restarted
    expect(screen.getByText(/resend otp in/i)).toBeInTheDocument()
  })
})
