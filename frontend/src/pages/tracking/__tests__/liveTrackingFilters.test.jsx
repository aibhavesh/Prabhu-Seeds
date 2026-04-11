import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { filterEmployees, toStatus, withDerivedFields } from '../utils/liveTrackingFilters'

describe('live tracking filters', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-24T10:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('derives online/stale/offline status from last_seen', () => {
    expect(toStatus('2026-10-24T09:58:00.000Z')).toBe('online')
    expect(toStatus('2026-10-24T09:50:00.000Z')).toBe('stale')
    expect(toStatus('2026-10-24T09:20:00.000Z')).toBe('offline')
    expect(toStatus('2026-10-23T18:00:00.000Z')).toBe('offline')
  })

  it('filters by search, department, state and online toggle', () => {
    const employees = [
      withDerivedFields({
        user_id: 'u1',
        name: 'Amit Sharma',
        department: 'Marketing',
        state: 'MP',
        last_seen: '2026-10-24T09:58:00.000Z',
      }),
      withDerivedFields({
        user_id: 'u2',
        name: 'Priya Verma',
        department: 'Production',
        state: 'RJ',
        last_seen: '2026-10-24T09:40:00.000Z',
      }),
      withDerivedFields({
        user_id: 'u3',
        name: 'Rahul Patil',
        department: 'Processing',
        state: 'MP',
        last_seen: '2026-10-24T08:50:00.000Z',
      }),
    ]

    const results = filterEmployees(employees, {
      query: 'amit',
      department: 'Marketing',
      state: 'MP',
      onlyOnline: true,
    })

    expect(results).toHaveLength(1)
    expect(results[0].name).toBe('Amit Sharma')
  })
})
