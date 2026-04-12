import { create } from 'zustand'

export const useAuthStore = create((set) => ({
  user: null,   // { id, role, name, mobile } or null
  token: null,  // string or null

  setAuth: (user, token) => set({ user, token }),
  clearAuth: () => {
    // Also clear duty status so timer doesn't bleed into the next session
    sessionStorage.removeItem('pga-duty-status')
    set({ user: null, token: null })
  },
}))
