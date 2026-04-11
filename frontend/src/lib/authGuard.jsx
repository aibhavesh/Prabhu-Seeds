import { redirect } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { getDashboardRoute, ROUTE_ROLES } from '@/lib/navConfig'

/**
 * React Router v6 loader — guards every protected route.
 * 1. Redirects unauthenticated users to /login.
 * 2. Redirects users who lack the required role to their own dashboard.
 */
export function authGuard({ request }) {
  const { token, user } = useAuthStore.getState()

  if (!token) {
    return redirect('/login')
  }

  const pathname = new URL(request.url).pathname
  const role = user?.role?.toLowerCase()

  // Find the most specific matching rule (longest prefix wins)
  const matchedPrefix = Object.keys(ROUTE_ROLES)
    .filter((prefix) => pathname === prefix || pathname.startsWith(prefix + '/'))
    .sort((a, b) => b.length - a.length)[0]

  if (matchedPrefix) {
    const allowed = ROUTE_ROLES[matchedPrefix]
    if (!allowed.includes(role)) {
      // Send them to their own dashboard instead
      return redirect(getDashboardRoute(role))
    }
  }

  return null
}
