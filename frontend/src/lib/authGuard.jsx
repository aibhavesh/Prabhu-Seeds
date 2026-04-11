import { redirect } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

/**
 * React Router v6 loader — redirects unauthenticated users to /login.
 * Attach as `loader` on every protected route.
 *
 * Usage in router config:
 *   { path: '/dashboard/owner', element: <OwnerDashboard />, loader: authGuard }
 */
export function authGuard() {
  const token = useAuthStore.getState().token
  if (!token) {
    return redirect('/login')
  }
  return null
}
