import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/axios'

function cleanParams(filters = {}) {
  return Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== '' && value != null)
  )
}

export function useTeamLeaves(filters = {}) {
  const params = cleanParams({ scope: 'team', ...filters })

  return useQuery({
    queryKey: ['leaves-team', params],
    queryFn: () => apiClient.get('/api/v1/leaves', { params }).then((res) => res.data),
    placeholderData: (prev) => prev,
    refetchInterval: 60_000,
  })
}

export function usePendingLeaveRequests(filters = {}) {
  const params = cleanParams({ scope: 'team', status: 'pending', ...filters })

  return useQuery({
    queryKey: ['leaves-pending', params],
    queryFn: () => apiClient.get('/api/v1/leaves', { params }).then((res) => res.data),
    placeholderData: (prev) => prev,
    refetchInterval: 30_000,
  })
}

export function useTeamLeaveBalances(filters = {}) {
  const params = cleanParams({ scope: 'team', view: 'balances', ...filters })

  return useQuery({
    queryKey: ['leaves-team-balances', params],
    queryFn: () => apiClient.get('/api/v1/leaves', { params }).then((res) => res.data),
    placeholderData: (prev) => prev,
    staleTime: 5 * 60 * 1000,
  })
}

export function useMyLeaveBalances(filters = {}) {
  const params = cleanParams({ scope: 'self', view: 'balances', ...filters })

  return useQuery({
    queryKey: ['leaves-my-balances', params],
    queryFn: () => apiClient.get('/api/v1/leaves', { params }).then((res) => res.data),
    placeholderData: (prev) => prev,
    staleTime: 5 * 60 * 1000,
  })
}

export function useMyLeaveHistory(filters = {}) {
  const params = cleanParams({ scope: 'self', view: 'history', ...filters })

  return useQuery({
    queryKey: ['leaves-my-history', params],
    queryFn: () => apiClient.get('/api/v1/leaves', { params }).then((res) => res.data),
    placeholderData: (prev) => prev,
    refetchInterval: 60_000,
  })
}

export function useApplyLeave() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload) => apiClient.post('/api/v1/leaves', payload).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaves-my-history'] })
      queryClient.invalidateQueries({ queryKey: ['leaves-my-balances'] })
      queryClient.invalidateQueries({ queryKey: ['leaves-team'] })
      queryClient.invalidateQueries({ queryKey: ['leaves-pending'] })
    },
  })
}

export function useReviewLeaveRequest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ leaveId, decision }) =>
      apiClient
        .patch(`/api/v1/leaves/${leaveId}`, { decision })
        .then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaves-pending'] })
      queryClient.invalidateQueries({ queryKey: ['leaves-team'] })
      queryClient.invalidateQueries({ queryKey: ['leaves-team-balances'] })
      queryClient.invalidateQueries({ queryKey: ['leaves-my-history'] })
    },
  })
}
