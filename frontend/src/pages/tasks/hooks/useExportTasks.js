import { useState, useRef } from 'react'
import toast from 'react-hot-toast'
import apiClient from '@/lib/axios'

const POLL_INTERVAL = 2000
const MAX_POLLS = 30

/**
 * Hook for CSV export with server-side job polling.
 *
 * Flow:
 *  1. POST /api/v1/tasks/export  → { job_id }
 *  2. Poll GET /api/v1/tasks/export/:job_id every 2 s
 *  3. When status === 'completed' → download the file blob
 */
export function useExportTasks(filters = {}) {
  const [exporting, setExporting] = useState(false)
  const pollRef = useRef(null)

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }

  function downloadBlob(blob, filename = 'tasks-export.csv') {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  async function startExport() {
    if (exporting) return
    setExporting(true)

    const toastId = toast.loading('Preparing export…')

    try {
      const params = Object.fromEntries(
        Object.entries(filters).filter(([, v]) => v !== '' && v != null)
      )
      const { data } = await apiClient.post('/api/v1/tasks/export', params)
      const jobId = data.job_id

      let polls = 0
      pollRef.current = setInterval(async () => {
        polls++
        if (polls > MAX_POLLS) {
          stopPolling()
          setExporting(false)
          toast.error('Export timed out. Please try again.', { id: toastId })
          return
        }

        try {
          const { data: job } = await apiClient.get(`/api/v1/tasks/export/${jobId}`)

          if (job.status === 'completed') {
            stopPolling()
            const { data: blob } = await apiClient.get(
              `/api/v1/tasks/export/${jobId}/download`,
              { responseType: 'blob' }
            )
            downloadBlob(blob)
            toast.success('Export downloaded!', { id: toastId })
            setExporting(false)
          } else if (job.status === 'failed') {
            stopPolling()
            setExporting(false)
            toast.error(job.message ?? 'Export failed.', { id: toastId })
          }
        } catch {
          stopPolling()
          setExporting(false)
          toast.error('Export failed.', { id: toastId })
        }
      }, POLL_INTERVAL)
    } catch {
      setExporting(false)
      toast.error('Could not start export.', { id: toastId })
    }
  }

  return { startExport, exporting }
}
