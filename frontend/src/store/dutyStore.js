import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

/**
 * Persists duty check-in state in sessionStorage.
 * - Survives sidebar navigation (component unmount/remount)
 * - Clears automatically when the browser tab is closed
 * - Cleared explicitly on logout (authStore.clearAuth calls checkOut)
 */
export const useDutyStore = create(
  persist(
    (set) => ({
      checkedIn: false,
      dutyStartedAt: null, // Unix timestamp (ms) or null

      checkIn: () => set({ checkedIn: true, dutyStartedAt: Date.now() }),
      checkOut: () => set({ checkedIn: false, dutyStartedAt: null }),
    }),
    {
      name: 'pga-duty-status',
      storage: createJSONStorage(() => sessionStorage),
    }
  )
)
