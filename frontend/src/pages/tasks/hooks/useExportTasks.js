import { useState } from 'react'
import toast from 'react-hot-toast'
import apiClient from '@/lib/axios'

/**
 * CSV export hook.
 * Calls GET /api/v1/tasks/export/csv which returns a CSV file directly.
 */
export function useExportTasks(filters = {}) {
  const [exporting, setExporting] = useState(false)

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
      const { data: blob } = await apiClient.get('/api/v1/tasks/export/csv', {
        responseType: 'blob',
      })
      downloadBlob(blob)
      toast.success('Export downloaded!', { id: toastId })
    } catch {
      toast.error('Could not export tasks. Please try again.', { id: toastId })
    } finally {
      setExporting(false)
    }
  }

  return { startExport, exporting }
}
