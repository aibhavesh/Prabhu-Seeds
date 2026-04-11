import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/axios'

function cleanParams(filters = {}) {
  return Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== '' && value != null)
  )
}

export function useTravelClaims(filters = {}) {
  const params = cleanParams(filters)

  return useQuery({
    queryKey: ['travel', params],
    queryFn: () => apiClient.get('/api/v1/travel', { params }).then((res) => res.data),
    placeholderData: (prev) => prev,
    refetchInterval: 30_000,
  })
}

export function useTravelHistory(filters = {}) {
  const params = cleanParams(filters)

  return useQuery({
    queryKey: ['travel-history', params],
    queryFn: () => apiClient.get('/api/v1/travel', { params }).then((res) => res.data),
    placeholderData: (prev) => prev,
    staleTime: 5 * 60 * 1000,
  })
}
