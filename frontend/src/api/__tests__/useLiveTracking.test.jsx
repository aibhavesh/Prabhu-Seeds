import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import useLiveTracking from '../useLiveTracking'

vi.mock('@/lib/axios', () => ({
  default: { get: vi.fn() },
}))

import apiClient from '@/lib/axios'

function wrapperFactory() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return function Wrapper({ children }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('useLiveTracking', () => {
  let statusCallback
  let insertCallback
  let channel
  let supabaseClient

  beforeEach(() => {
    vi.clearAllMocks()

    channel = {
      on: vi.fn((_, __, cb) => {
        insertCallback = cb
        return channel
      }),
      subscribe: vi.fn((cb) => {
        statusCallback = cb
        return channel
      }),
      unsubscribe: vi.fn(),
    }

    supabaseClient = {
      channel: vi.fn(() => channel),
      removeChannel: vi.fn(),
    }

    apiClient.get.mockResolvedValue({
      data: [
        {
          user_id: 'u1',
          name: 'Amit Sharma',
          department: 'Marketing',
          state: 'MP',
          lat: 23.25,
          lng: 77.41,
          accuracy: 8,
          last_seen: new Date().toISOString(),
        },
      ],
    })
  })

  it('fetches initial live tracking positions', async () => {
    const { result } = renderHook(
      () => useLiveTracking({ supabaseClient }),
      { wrapper: wrapperFactory() }
    )

    await waitFor(() => {
      expect(result.current.employees.length).toBe(1)
    })

    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/tracking/live')
    expect(result.current.employees[0].name).toBe('Amit Sharma')
  })

  it('applies realtime INSERT waypoint updates to existing employee', async () => {
    const { result } = renderHook(
      () => useLiveTracking({ supabaseClient }),
      { wrapper: wrapperFactory() }
    )

    await waitFor(() => {
      expect(result.current.employees.length).toBe(1)
    })

    act(() => {
      statusCallback('SUBSCRIBED')
      insertCallback({
        new: {
          user_id: 'u1',
          lat: 24.0,
          lng: 78.0,
          created_at: new Date().toISOString(),
        },
      })
    })

    await waitFor(() => {
      expect(result.current.employees[0].lat).toBe(24)
      expect(result.current.employees[0].lng).toBe(78)
      expect(result.current.isRealtimeConnected).toBe(true)
    })
  })

  it('switches to polling fallback when realtime channel errors', async () => {
    const { result } = renderHook(
      () => useLiveTracking({ supabaseClient }),
      { wrapper: wrapperFactory() }
    )

    await waitFor(() => {
      expect(result.current.employees.length).toBe(1)
    })

    act(() => {
      statusCallback('CHANNEL_ERROR')
    })

    await waitFor(() => {
      expect(result.current.isPollingFallback).toBe(true)
      expect(result.current.isRealtimeConnected).toBe(false)
    })
  })
})
