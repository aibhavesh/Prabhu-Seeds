import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,   // { id, role, name, mobile } or null
      token: null,  // string or null

      setAuth: (user, token) => set({ user, token }),
      clearAuth: () => {
        sessionStorage.removeItem('pga-duty-status')
        set({ user: null, token: null })
      },
    }),
    {
      name: 'pga-auth',
      // sessionStorage is tab-isolated — each tab keeps its own session,
      // so owner + field agent can run side-by-side without colliding.
      // Survives page refresh within the tab; clears when the tab is closed.
      storage: createJSONStorage(() => sessionStorage),
      partialize: (s) => ({ user: s.user, token: s.token }),
    }
  )
)
