import { create } from 'zustand'

export const useAuthStore = create((set) => ({
  user: null,   // { id, role, name, mobile } or null
  token: null,  // string or null

  setAuth: (user, token) => set({ user, token }),
  clearAuth: () => set({ user: null, token: null }),
}))
