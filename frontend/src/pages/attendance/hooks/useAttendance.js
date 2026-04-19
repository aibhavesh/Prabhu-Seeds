import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/axios'

export function useAttendance(filters = {}) {
  const params = Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== '' && value != null)
  )

  return useQuery({
    queryKey: ['attendance', params],
    queryFn: () => apiClient.get('/api/v1/attendance', { params }).then((res) => res.data),
    placeholderData: (prev) => prev,
    refetchInterval: 30_000,
  })
}

export function useAttendanceReport(filters = {}) {
  const params = Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== '' && value != null)
  )

  return useQuery({
    queryKey: ['attendance-report', params],
    queryFn: () => apiClient.get('/api/v1/attendance/report', { params }).then((res) => res.data),
    placeholderData: (prev) => prev,
    staleTime: 5 * 60 * 1000,
  })
}

/** Today's check-in record for the current user. */
export function useMyTodayAttendance() {
  return useQuery({
    queryKey: ['attendance-today'],
    queryFn: () => apiClient.get('/api/v1/attendance/today').then((res) => res.data),
    refetchInterval: 15_000,
  })
}

/** Monthly attendance list + calendar days for the current user. */
export function useMyMonthlyReport(month) {
  return useQuery({
    queryKey: ['attendance-my-monthly', month],
    queryFn: () =>
      apiClient
        .get('/api/v1/attendance/report', { params: { month } })
        .then((res) => res.data),
    placeholderData: (prev) => prev,
    staleTime: 5 * 60 * 1000,
    enabled: !!month,
  })
}

/** Attendance history list for the current user (filtered by month). */
export function useMyAttendanceHistory(month) {
  return useQuery({
    queryKey: ['attendance-my-history', month],
    queryFn: () =>
      apiClient
        .get('/api/v1/attendance', { params: { month, limit: 60 } })
        .then((res) => res.data),
    placeholderData: (prev) => prev,
    staleTime: 5 * 60 * 1000,
    enabled: !!month,
  })
}

/**
 * Team attendance for a given date — manager/owner only.
 * Returns all field staff check-ins for the selected day.
 */
export function useTeamAttendance({ date, skip = 0, limit = 100 } = {}) {
  const params = Object.fromEntries(
    Object.entries({ date, skip: skip || undefined, limit }).filter(([, v]) => v != null && v !== '')
  )
  return useQuery({
    queryKey: ['team-attendance', params],
    queryFn: () => apiClient.get('/api/v1/attendance/team', { params }).then((r) => r.data),
    refetchInterval: 30_000,
    placeholderData: (prev) => prev,
  })
}

/** Check in for today — requires lat/lng from browser geolocation. */
export function useCheckIn() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ lat, lng }) =>
      apiClient.post('/api/v1/attendance/check-in', { lat, lng }).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-today'] })
      queryClient.invalidateQueries({ queryKey: ['attendance-my-monthly'] })
      queryClient.invalidateQueries({ queryKey: ['attendance-my-history'] })
    },
  })
}

/** Check out for today — requires lat/lng and km travelled. */
export function useCheckOut() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ lat, lng, km = 0 }) =>
      apiClient.post('/api/v1/attendance/check-out', { lat, lng, km }).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-today'] })
      queryClient.invalidateQueries({ queryKey: ['attendance-my-monthly'] })
      queryClient.invalidateQueries({ queryKey: ['attendance-my-history'] })
    },
  })
}
