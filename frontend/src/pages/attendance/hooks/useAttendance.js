import { useQuery } from '@tanstack/react-query'
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
